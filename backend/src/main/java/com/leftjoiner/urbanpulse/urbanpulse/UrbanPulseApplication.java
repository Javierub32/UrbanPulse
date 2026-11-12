package com.leftjoiner.urbanpulse.urbanpulse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class UrbanPulseApplication {

    public static void main(String[] args) {
        SpringApplication.run(UrbanPulseApplication.class, args);
    }

}
