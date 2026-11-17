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
}
