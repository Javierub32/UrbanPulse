package com.leftjoiner.urbanpulse.urbanpulse.entity;

import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.lang.reflect.ParameterizedType;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class EntityMappingTest {

    @Test
    void incidentKnowledgeDocumentsUsesTheSchemaJoinTable() throws NoSuchFieldException {
        Field field = IncidentEntity.class.getDeclaredField("knowledgeDocuments");
        JoinTable joinTable = field.getAnnotation(JoinTable.class);

        assertEquals(List.class, field.getType());
        assertEquals(KnowledgeDocumentEntity.class,
                ((ParameterizedType) field.getGenericType()).getActualTypeArguments()[0]);
        assertNotNull(field.getAnnotation(ManyToMany.class));
        assertNotNull(joinTable);
        assertEquals("\"IncidentKnowledgeDocument\"", joinTable.name());
        assertEquals("\"incidentId\"", joinTable.joinColumns()[0].name());
        assertEquals("\"knowledgeDocumentId\"", joinTable.inverseJoinColumns()[0].name());
    }
}
