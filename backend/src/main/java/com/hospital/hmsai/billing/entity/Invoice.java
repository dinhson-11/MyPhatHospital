package com.hospital.hmsai.billing.entity;

import com.hospital.hmsai.clinical.entity.Visit;
import com.hospital.hmsai.patient.entity.Patient;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity Invoice – map bảng invoices.
 * Quản lý hóa đơn viện phí tự động từ lượt khám (FR-7.1, FR-7.2).
 */
@Entity
@Table(name = "invoices")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Mã hóa đơn in trên phiếu thu và nội dung chuyển khoản, VD: HD261010000123. */
    @Column(name = "invoice_code", length = 30, unique = true)
    private String invoiceCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visit_id", nullable = false)
    private Visit visit;

    /** Tổng chi phí khám chữa bệnh (trước BHYT). */
    @Column(name = "total_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    /** Số thẻ BHYT tại thời điểm lập hóa đơn (snapshot). */
    @Column(name = "insurance_number", length = 15)
    private String insuranceNumber;

    /** Mức hưởng BHYT áp dụng, đơn vị % (0 – 100). */
    @Column(name = "insurance_rate", precision = 5, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal insuranceRate = BigDecimal.ZERO;

    /** Phần BHYT chi trả. */
    @Column(name = "insurance_amount", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal insuranceAmount = BigDecimal.ZERO;

    /** Lý do áp dụng / không áp dụng BHYT (hiển thị cho thu ngân). */
    @Column(name = "insurance_note", length = 255)
    private String insuranceNote;

    /** Người bệnh cùng chi trả = tổng chi phí - BHYT chi trả. Đây là số tiền thu ngân thu. */
    @Column(name = "patient_amount", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal patientAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private InvoiceStatus status = InvoiceStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    private PaymentMethod paymentMethod;

    @Column(name = "transaction_code", length = 100)
    private String transactionCode;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    /** Tiền khách đưa (thanh toán tiền mặt). */
    @Column(name = "amount_received", precision = 12, scale = 2)
    private BigDecimal amountReceived;

    /** Tiền thừa trả lại khách. */
    @Column(name = "change_amount", precision = 12, scale = 2)
    private BigDecimal changeAmount;

    @Column(name = "cashier_id")
    private Long cashierId;

    @Column(name = "cashier_name", length = 150)
    private String cashierName;

    @Column(name = "note", length = 255)
    private String note;

    /** Lý do hủy (CANCELLED) hoặc hoàn tiền (REFUNDED). */
    @Column(name = "void_reason", length = 255)
    private String voidReason;

    @Column(name = "voided_at")
    private LocalDateTime voidedAt;

    @Column(name = "voided_by", length = 150)
    private String voidedBy;

    /** Khóa lạc quan: chặn hai thu ngân cùng thu / hủy một hóa đơn. */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<InvoiceItem> items = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void addItem(InvoiceItem item) {
        items.add(item);
        item.setInvoice(this);
    }

    public void clearItems() {
        items.forEach(item -> item.setInvoice(null));
        items.clear();
    }
}
