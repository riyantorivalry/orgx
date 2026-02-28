package com.orgx.attendance.repository;

import com.orgx.attendance.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MemberRepository extends JpaRepository<Member, UUID> {
    List<Member> findByFullNameContainingIgnoreCaseAndActiveTrue(String query);
}
