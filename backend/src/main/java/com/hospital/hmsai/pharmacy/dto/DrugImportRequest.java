package com.hospital.hmsai.pharmacy.dto;

import com.hospital.hmsai.pharmacy.importer.DrugExcelFormat;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DrugImportRequest {

    @NotEmpty(message = "Chưa chọn thuốc nào để nhập")
    @Size(max = DrugExcelFormat.MAX_ROWS, message = "Tối đa " + DrugExcelFormat.MAX_ROWS + " thuốc mỗi lần nhập")
    @Valid
    private List<DrugImportItem> items;
}
