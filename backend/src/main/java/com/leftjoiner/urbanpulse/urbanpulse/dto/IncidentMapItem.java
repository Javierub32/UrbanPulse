package com.leftjoiner.urbanpulse.urbanpulse.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class IncidentMapItem {
    private String type;
    private String id;
    private String title;
    private String category;
    private String status;
    private double latitude;
    private double longitude;
    private long count;
    private Double west;
    private Double south;
    private Double east;
    private Double north;
}
