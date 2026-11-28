package com.leftjoiner.urbanpulse.urbanpulse.validation;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.MemoryCacheImageInputStream;
import org.springframework.web.multipart.MultipartFile;

public final class AttachmentPolicy {
    public static final long MAX_FILE_BYTES = 10L * 1024 * 1024;
    public static final int MAX_ATTACHMENTS_PER_INCIDENT = 5;
    private static final List<String> VIDEO_TRACK_PATH = List.of("trak", "mdia", "hdlr");

    private AttachmentPolicy() {}

    public static void validateCapacity(long existingAttachments) {
        if (existingAttachments >= MAX_ATTACHMENTS_PER_INCIDENT) {
            throw new IllegalArgumentException("La incidencia ya tiene 5 adjuntos.");
        }
    }

    public static Format validateFile(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("El fichero está vacío.");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new IllegalArgumentException("El fichero supera el límite de 10 MB.");
        }

        try (var content = file.getInputStream(); var image = new MemoryCacheImageInputStream(content)) {
            Format video = readVideoFormat(image, file.getSize());
            if (video != null) {
                return video;
            }
            image.seek(0);
            var readers = ImageIO.getImageReaders(image);
            if (readers.hasNext()) {
                return readImageFormat(readers.next(), image, file.getSize());
            }
        }
        throw new IllegalArgumentException("El formato del fichero no está permitido.");
    }

    private static Format readVideoFormat(MemoryCacheImageInputStream content, long fileSize) throws IOException {
        Format format = null;
        boolean hasFileType = false;
        boolean hasMediaData = false;
        String videoHandler = null;
        while (content.getStreamPosition() < fileSize) {
            Box box = readBox(content, fileSize);
            if (box == null) {
                return null;
            }
            switch (box.type()) {
                case "ftyp" -> {
                    long payloadSize = box.end() - content.getStreamPosition();
                    if (hasFileType || payloadSize < 8 || payloadSize % 4 != 0) {
                        return null;
                    }
                    hasFileType = true;
                    format = switch (readCode(content)) {
                        case "qt  " -> Format.MOV;
                        case "isom", "iso2", "iso3", "iso4", "iso5", "iso6", "iso7", "iso8", "iso9",
                                "mp41", "mp42", "avc1", "M4V " -> Format.MP4;
                        default -> null;
                    };
                    if (format == null) {
                        return null;
                    }
                }
                case "moov" -> videoHandler = findVideoHandler(content, box.end(), 0);
                case "mdat" -> hasMediaData |= content.getStreamPosition() < box.end();
                default -> { }
            }
            content.seek(box.end());
        }
        if (videoHandler == null || !hasMediaData) {
            return null;
        }
        return !hasFileType && "mhlr".equals(videoHandler) ? Format.MOV : format;
    }

    private static String findVideoHandler(MemoryCacheImageInputStream content, long end, int depth) throws IOException {
        while (content.getStreamPosition() < end) {
            Box box = readBox(content, end);
            if (box == null) {
                return null;
            }
            if (VIDEO_TRACK_PATH.get(depth).equals(box.type())) {
                if (depth < VIDEO_TRACK_PATH.size() - 1) {
                    String handler = findVideoHandler(content, box.end(), depth + 1);
                    if (handler != null) {
                        return handler;
                    }
                } else if (box.end() - content.getStreamPosition() >= 24) {
                    content.readInt(); // Version and flags
                    String handler = readCode(content);
                    if ("vide".equals(readCode(content))) {
                        return handler;
                    }
                }
            }
            content.seek(box.end());
        }
        return null;
    }

    private static Box readBox(MemoryCacheImageInputStream content, long limit) throws IOException {
        long start = content.getStreamPosition();
        if (limit - start < 8) {
            return null;
        }
        long size = Integer.toUnsignedLong(content.readInt());
        String type = readCode(content);
        if (size == 1) {
            if (limit - start < 16) {
                return null;
            }
            size = content.readLong();
        } else if (size == 0) {
            size = limit - start;
        }
        if (size < content.getStreamPosition() - start || size > limit - start) {
            return null;
        }
        return new Box(type, start + size);
    }

    private static String readCode(MemoryCacheImageInputStream content) throws IOException {
        byte[] bytes = new byte[4];
        content.readFully(bytes);
        return new String(bytes, StandardCharsets.US_ASCII);
    }

    private record Box(String type, long end) {}

    private static boolean hasCompletePngStructure(MemoryCacheImageInputStream image, long fileSize) throws IOException {
        image.seek(8); // PNG signature
        boolean hasImageData = false;
        while (fileSize - image.getStreamPosition() >= 12) {
            long length = Integer.toUnsignedLong(image.readInt());
            String type = readCode(image);
            if (length > fileSize - image.getStreamPosition() - 4) {
                return false;
            }
            image.seek(image.getStreamPosition() + length + 4); // Payload and checksum
            if ("IDAT".equals(type) && length > 0) {
                hasImageData = true;
            } else if ("IEND".equals(type)) {
                return hasImageData && length == 0 && image.getStreamPosition() == fileSize;
            }
        }
        return false;
    }

    private static Format readImageFormat(ImageReader reader, MemoryCacheImageInputStream image, long fileSize) {
        try {
            Format format = switch (reader.getFormatName()) {
                case "JPEG" -> Format.JPEG;
                case "png" -> Format.PNG;
                default -> throw new IllegalArgumentException("El formato del fichero no está permitido.");
            };
            if (format == Format.PNG) {
                if (!hasCompletePngStructure(image, fileSize)) {
                    throw new IllegalArgumentException("La imagen PNG está incompleta.");
                }
                image.seek(0);
            }
            reader.setInput(image, true, true);
            if (reader.getWidth(0) <= 0 || reader.getHeight(0) <= 0) {
                throw new IllegalArgumentException("La imagen no es válida.");
            }
            return format;
        } catch (IOException e) {
            throw new IllegalArgumentException("La cabecera de la imagen no es válida.", e);
        } finally {
            reader.dispose();
        }
    }

    public enum Format {
        JPEG, PNG, MP4, MOV
    }
}
