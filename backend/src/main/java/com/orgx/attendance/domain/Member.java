package com.orgx.attendance.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "members")
public class Member {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String memberCode;

    @Column(nullable = false, length = 150)
    private String fullName;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false, length = 100)
    private String createdBy;

    @Column
    private LocalDate dob;

    @Column(length = 5)
    private String bloodType;

    @Column(length = 255)
    private String address;

    @Column(length = 150)
    private String email;

    @Column(name = "mobile_number", length = 30)
    private String mobileNumber;

    @Column(nullable = false, length = 100)
    private String updatedBy;

    @Column(nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();
}
