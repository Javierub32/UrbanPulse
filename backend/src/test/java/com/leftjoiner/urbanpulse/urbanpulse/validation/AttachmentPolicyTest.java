package com.leftjoiner.urbanpulse.urbanpulse.validation;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class AttachmentPolicyTest {
    @Test
    void recognizesPngFromItsContent() throws IOException {
        assertEquals(AttachmentPolicy.Format.PNG, AttachmentPolicy.validateFile(image("png")));
    }

    @Test
    void recognizesJpegFromItsContent() throws IOException {
        assertEquals(AttachmentPolicy.Format.JPEG, AttachmentPolicy.validateFile(image("jpeg")));
    }

    @Test
    void rejectsPngWithDimensionsButNoImageData() throws IOException {
        byte[] header = Arrays.copyOf(image("png").getBytes(), 33);
        var truncated = new MockMultipartFile("file", "report.png", "image/png", header);

        assertThrows(IllegalArgumentException.class, () -> AttachmentPolicy.validateFile(truncated));
    }

    @Test
    void recognizesMp4AndMovWithAVideoTrack() throws IOException {
        assertEquals(AttachmentPolicy.Format.MP4, AttachmentPolicy.validateFile(
                videoFile(fileType("isom"), movie("\0\0\0\0", "vide"), new byte[1])));
        assertEquals(AttachmentPolicy.Format.MOV, AttachmentPolicy.validateFile(
                videoFile(fileType("qt  "), movie("mhlr", "vide"), new byte[1])));
        assertEquals(AttachmentPolicy.Format.MOV, AttachmentPolicy.validateFile(
                videoFile(new byte[0], movie("mhlr", "vide"), new byte[1])));
    }

    @Test
    void rejectsIncompleteContainerAndAudioWithoutAVideoTrack() {
        byte[] type = fileType("isom");
        var truncated = new MockMultipartFile("file", Arrays.copyOf(type, type.length - 1));
        var headerOnly = new MockMultipartFile("file", type);
        var audioOnly = videoFile(type, movie("\0\0\0\0", "soun"), new byte[1]);

        assertThrows(IllegalArgumentException.class, () -> AttachmentPolicy.validateFile(truncated));
        assertThrows(IllegalArgumentException.class, () -> AttachmentPolicy.validateFile(headerOnly));
        assertThrows(IllegalArgumentException.class, () -> AttachmentPolicy.validateFile(audioOnly));
    }

    @Test
    void rejectsPdfPresentedAsPng() {
        var bytes = "%PDF-1.7\n".getBytes(StandardCharsets.US_ASCII);
        var file = new MockMultipartFile("file", "report.png", "image/png", bytes);

        assertThrows(IllegalArgumentException.class, () -> AttachmentPolicy.validateFile(file));
    }

    @Test
    void rejectsEmptyFile() {
        var file = new MockMultipartFile("file", new byte[0]);

        assertThrows(IllegalArgumentException.class, () -> AttachmentPolicy.validateFile(file));
    }

    @Test
    void rejectsFileLargerThanTenMegabytes() {
        var file = new MockMultipartFile("file", new byte[10_485_761]);

        var error = assertThrows(IllegalArgumentException.class, () -> AttachmentPolicy.validateFile(file));
        assertEquals("El fichero supera el límite de 10 MB.", error.getMessage());
    }

    @Test
    void acceptsExactlyTenMegabytes() throws IOException {
        byte[] type = fileType("isom");
        byte[] metadata = movie("\0\0\0\0", "vide");
        int mediaDataHeaderSize = 8;
        var file = videoFile(type, metadata, new byte[10_485_760 - type.length - metadata.length - mediaDataHeaderSize]);

        assertEquals(AttachmentPolicy.Format.MP4, AttachmentPolicy.validateFile(file));
    }

    @Test
    void allowsFifthAttachmentAndRejectsSixth() {
        assertDoesNotThrow(() -> AttachmentPolicy.validateCapacity(4));
        assertThrows(IllegalArgumentException.class, () -> AttachmentPolicy.validateCapacity(5));
    }

    private MockMultipartFile image(String format) throws IOException {
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), format, bytes);
        return new MockMultipartFile("file", "report.bin", "application/octet-stream", bytes.toByteArray());
    }

    private MockMultipartFile videoFile(byte[] type, byte[] metadata, byte[] data) {
        var bytes = new ByteArrayOutputStream();
        bytes.writeBytes(type);
        bytes.writeBytes(metadata);
        bytes.writeBytes(box("mdat", data));
        return new MockMultipartFile("file", "video.bin", "application/octet-stream", bytes.toByteArray());
    }

    private byte[] fileType(String brand) {
        byte[] payload = ByteBuffer.allocate(12).put(code(brand)).putInt(0).put(code(brand)).array();
        return box("ftyp", payload);
    }

    private byte[] movie(String componentType, String handlerType) {
        byte[] handler = ByteBuffer.allocate(24).putInt(0).put(code(componentType)).put(code(handlerType)).array();
        return box("moov", box("trak", box("mdia", box("hdlr", handler))));
    }

    private byte[] box(String type, byte[] payload) {
        int size = 8 + payload.length;
        return ByteBuffer.allocate(size).putInt(size).put(code(type)).put(payload).array();
    }

    private byte[] code(String value) {
        return value.getBytes(StandardCharsets.US_ASCII);
    }
}
