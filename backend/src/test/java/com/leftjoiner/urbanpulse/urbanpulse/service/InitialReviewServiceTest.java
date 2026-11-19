package com.leftjoiner.urbanpulse.urbanpulse.service;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.leftjoiner.urbanpulse.urbanpulse.entity.*;
import com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentStatus;
import com.leftjoiner.urbanpulse.urbanpulse.mapper.IncidentMapper;
import com.leftjoiner.urbanpulse.urbanpulse.repository.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;
class InitialReviewServiceTest {
 @Test void validatesAndRecordsHistory() {
  var repo=mock(IncidentRepository.class); var history=mock(StatusChangeRepository.class); var users=mock(UserRepository.class);
  var service=new InitialReviewService(repo,history,users,new IncidentMapper());
  var id=UUID.randomUUID(); var actorId=UUID.randomUUID(); var incident=new IncidentEntity(); var actor=new UserEntity();
  incident.setStatus(IncidentStatus.REPORTED); when(repo.findForReview(id)).thenReturn(Optional.of(incident)); when(users.findById(actorId)).thenReturn(Optional.of(actor));
  service.act(id,actorId,IncidentStatus.VALIDATED,null,"VALIDATED");
  var c=ArgumentCaptor.forClass(StatusChangeEntity.class); verify(history).save(c.capture());
  assertEquals(IncidentStatus.REPORTED,c.getValue().getPreviousStatus()); assertEquals(IncidentStatus.VALIDATED,c.getValue().getStatus());
  assertSame(actor,c.getValue().getUser()); assertNotNull(c.getValue().getChangedAt()); assertEquals(IncidentStatus.VALIDATED,incident.getStatus());
  assertThrows(ResponseStatusException.class,()->service.act(id,actorId,IncidentStatus.REJECTED,"x","REJECTED")); verify(history,times(1)).save(any());
 }
 @Test void requestRetainsReportedStatus() {
  var repo=mock(IncidentRepository.class); var history=mock(StatusChangeRepository.class); var users=mock(UserRepository.class);
  var service=new InitialReviewService(repo,history,users,new IncidentMapper()); var id=UUID.randomUUID(); var actor=UUID.randomUUID(); var incident=new IncidentEntity();
  incident.setStatus(IncidentStatus.REPORTED); when(repo.findForReview(id)).thenReturn(Optional.of(incident)); when(users.findById(actor)).thenReturn(Optional.of(new UserEntity()));
  service.act(id,actor,IncidentStatus.REPORTED," Necesita foto ","INFORMATION_REQUESTED");
  var c=ArgumentCaptor.forClass(StatusChangeEntity.class); verify(history).save(c.capture()); assertEquals("Necesita foto",c.getValue().getReason()); assertEquals(IncidentStatus.REPORTED,incident.getStatus());
 }
 @Test void editingRecordsAuthenticatedActorAndOnlyChangedFields() {
  var repo=mock(IncidentRepository.class); var history=mock(StatusChangeRepository.class); var users=mock(UserRepository.class);
  var service=new InitialReviewService(repo,history,users,new IncidentMapper());
  var id=UUID.randomUUID(); var actorId=UUID.randomUUID(); var incident=new IncidentEntity(); var actor=new UserEntity();
  incident.setStatus(IncidentStatus.REPORTED);
  incident.setCategory(com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory.CLEANING);
  incident.setPriority(com.leftjoiner.urbanpulse.urbanpulse.entity.enums.Priority.LOW);
  incident.setLocation(new org.locationtech.jts.geom.GeometryFactory(new org.locationtech.jts.geom.PrecisionModel(),4326).createPoint(new org.locationtech.jts.geom.Coordinate(-4.4,36.7)));
  when(repo.findForReview(id)).thenReturn(Optional.of(incident)); when(users.findById(actorId)).thenReturn(Optional.of(actor));
  var edit=new com.leftjoiner.urbanpulse.urbanpulse.dto.ReviewEditRequest(com.leftjoiner.urbanpulse.urbanpulse.entity.enums.IncidentCategory.TRAFFIC,com.leftjoiner.urbanpulse.urbanpulse.entity.enums.Priority.LOW,36.7,-4.4);
  service.edit(id,edit,actorId);
  var saved=ArgumentCaptor.forClass(StatusChangeEntity.class); verify(history).save(saved.capture());
  assertSame(actor,saved.getValue().getUser()); assertSame(incident,saved.getValue().getIncident());
  assertEquals("INCIDENT_EDITED",saved.getValue().getComment()); assertEquals("categoría",saved.getValue().getReason());
  assertEquals(IncidentStatus.REPORTED,saved.getValue().getPreviousStatus()); assertEquals(IncidentStatus.REPORTED,saved.getValue().getStatus());
  assertNotNull(saved.getValue().getChangedAt()); assertEquals(saved.getValue().getChangedAt(),incident.getUpdatedAt());
  service.edit(id,edit,actorId); verify(history,times(1)).save(any());
  incident.setStatus(IncidentStatus.VALIDATED);
  assertThrows(ResponseStatusException.class,()->service.edit(id,edit,actorId)); verify(history,times(1)).save(any());
 }
}
