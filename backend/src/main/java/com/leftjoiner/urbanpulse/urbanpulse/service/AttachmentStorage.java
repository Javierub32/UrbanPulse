package com.leftjoiner.urbanpulse.urbanpulse.service;

import com.leftjoiner.urbanpulse.urbanpulse.config.AttachmentStorageConfig;
import com.leftjoiner.urbanpulse.urbanpulse.exception.AttachmentException;
import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.errors.ErrorResponseException;
import java.io.InputStream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AttachmentStorage {
    private final MinioClient client;
    private final AttachmentStorageConfig.Settings settings;

    public void put(String key, InputStream stream, long size, String contentType) {
        try {
            ensureBucket();
            client.putObject(PutObjectArgs.builder().bucket(settings.bucket()).object(key)
                    .stream(stream, size, -1L).contentType(contentType).build());
        } catch (Exception e) {
            throw AttachmentException.unavailable(e);
        }
    }

    public InputStream open(String key) {
        try {
            return client.getObject(GetObjectArgs.builder().bucket(settings.bucket()).object(key).build());
        } catch (ErrorResponseException e) {
            if ("NoSuchKey".equals(e.errorResponse().code())) {
                throw AttachmentException.notFound();
            }
            throw AttachmentException.unavailable(e);
        } catch (Exception e) {
            throw AttachmentException.unavailable(e);
        }
    }

    public void remove(String key) {
        try {
            client.removeObject(RemoveObjectArgs.builder().bucket(settings.bucket()).object(key).build());
        } catch (Exception e) {
            throw AttachmentException.unavailable(e);
        }
    }

    private void ensureBucket() throws Exception {
        BucketExistsArgs lookup = BucketExistsArgs.builder().bucket(settings.bucket()).build();
        if (client.bucketExists(lookup)) {
            return;
        }
        try {
            client.makeBucket(MakeBucketArgs.builder().bucket(settings.bucket()).build());
        } catch (ErrorResponseException e) {
            if (!"BucketAlreadyOwnedByYou".equals(e.errorResponse().code())) {
                throw e;
            }
        }
    }
}
