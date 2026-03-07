package com.orgx.attendance.repository;

import com.orgx.attendance.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MemberRepository extends JpaRepository<Member, UUID> {
    List<Member> findByFullNameContainingIgnoreCaseAndActiveTrue(String query);
    Optional<Member> findByIdAndActiveTrue(UUID id);
    long countByActiveTrue();
    boolean existsByMemberCode(String memberCode);
}
