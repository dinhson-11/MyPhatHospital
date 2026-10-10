package com.hospital.hmsai.billing.dto;

import com.hospital.hmsai.billing.entity.InvoiceItem;
import com.hospital.hmsai.billing.entity.InvoiceItemType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceItemResponse {

    private Long id;
    private InvoiceItemType itemType;
    private Long refId;
    private String description;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal amount;

    public static InvoiceItemResponse fromEntity(InvoiceItem item) {
        if (item == null) return null;
        return InvoiceItemResponse.builder()
                .id(item.getId())
                .itemType(item.getItemType())
                .refId(item.getRefId())
                .description(item.getDescription())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .amount(item.getAmount())
                .build();
    }
}
