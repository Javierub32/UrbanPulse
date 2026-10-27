package com.leftjoiner.urbanpulse.urbanpulse.mapper;

public abstract class MapperDTO<E, D> {

    public abstract D toDTO(E entity);
}
