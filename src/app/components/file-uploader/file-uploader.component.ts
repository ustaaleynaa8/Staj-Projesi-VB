import { Component, EventEmitter, Output } from '@angular/core';
import { CsvOptions } from 'src/app/services/csv-converter.service';
import { TxtToJsonOptions } from 'src/app/services/txt-to-json.service';
import { FileConverterService } from 'src/app/services/file-converter.service';

@Component({
    selector: 'app-file-uploader',
    templateUrl: './file-uploader.component.html',
    styleUrls: ['./file-uploader.component.scss'],
})
export class FileUploaderComponent {
    @Output() onConvert = new EventEmitter<any>();
    @Output() onError = new EventEmitter<string>();
    @Output() onFileClear = new EventEmitter<void>();
    @Output() onOptionsChange = new EventEmitter<any>();

    selectedFile: File | null = null;
    fileType: 'csv' | 'txt' | 'xml' | null = null;
    isProcessing = false;

    // CSV options
    hasHeader = true;
    skipEmptyLines = true;
    selectedDelimiter = ',';
    doubleQuoteWrap = true;
    selectedRowDelimiter = 'newline';
    rowPrefix = '';
    rowSuffix = '';
    selectedEncoding = 'utf-8';
    selectedQuoteOption: 'none' | 'single' | 'double' = 'none';
    trimWhitespace = true;

    // TXT options
    fieldCount = 3;
    fieldConfigs = [
        { start: 0, length: 10 },
        { start: 10, length: 10 },
        { start: 20, length: 10 },
    ];

    // XML options
    xmlRootElement: string = '';
    xmlFieldMapping: string = '';

    constructor(private fileConverterService: FileConverterService) { }

    // Kullanılabilir CSV ayar seçenekleri
    delimiterOptions = [
        { value: ',', label: 'Virgül (,)' },
        { value: ';', label: 'Noktalı Virgül (;)' },
        { value: '\t', label: 'Sekme (Tab)' },
        { value: '|', label: 'Dikey Çizgi (|)' },
    ];

    rowDelimiterOptions = [
        { value: 'newline', label: 'Yeni Satır (\\n)' },
        { value: 'carriage', label: 'Satır Başı (\\r)' },
        { value: '\r\n', label: 'Windows (\\r\\n)' },
    ];

    quoteOptions = [
        { value: 'none', label: 'Yok' },
        { value: 'single', label: 'Tek Tırnak (\')' },
        { value: 'double', label: 'Çift Tırnak (")' },
    ];

    encodingOptions = [
        { value: 'utf-8', label: 'UTF-8' },
        { value: 'iso-8859-1', label: 'ISO-8859-1' },
        { value: 'windows-1254', label: 'Windows-1254 (Türkçe)' },
    ];


    onFileSelect(event: any): void {
        const files = event.target.files;
        if (files && files.length > 0) {
            this.selectedFile = files[0];
        }
    }

    clearSelection(): void {
        this.selectedFile = null;
        this.fileType = null;
        const fileInput = document.getElementById('csvFileInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        this.onFileClear.emit();
    }

    getCsvOptions(): CsvOptions {
        return {
            hasHeader: this.hasHeader,
            skipEmptyLines: this.skipEmptyLines,
            selectedDelimiter: this.selectedDelimiter,
            doubleQuoteWrap: this.doubleQuoteWrap,
            selectedRowDelimiter: this.selectedRowDelimiter,
            rowPrefix: this.rowPrefix,
            rowSuffix: this.rowSuffix,
            selectedEncoding: this.selectedEncoding,
            selectedQuoteOption: this.selectedQuoteOption,
            trimWhitespace: this.trimWhitespace,
        };
    }

    getTxtOptions(): TxtToJsonOptions {
        return {
            fieldCount: this.fieldCount,
            startPositions: this.fieldConfigs.map(c => c.start),
            lengths: this.fieldConfigs.map(c => c.length),
            hasHeader: this.hasHeader,
            skipEmptyLines: this.skipEmptyLines,
        };
    }

    parseMapping(text: string): { [key: string]: string[] } | undefined {
        try {
            return text ? JSON.parse(text) : undefined;
        } catch {
            this.onError.emit('Field Mapping JSON formatı hatalı.');
            return undefined;
        }
    }

    async processData(): Promise<void> {
        if (!this.selectedFile || !this.fileType) {
            this.onError.emit('Dosya ve tür seçilmelidir.');
            return;
        }

        const converter = this.fileConverterService.getConverter(this.fileType);
        if (!converter) {
            this.onError.emit('Desteklenmeyen dosya türü.');
            return;
        }

        this.isProcessing = true;

        try {
            let options: any = null;

            if (this.fileType === 'csv') options = this.getCsvOptions();
            else if (this.fileType === 'txt') options = this.getTxtOptions();
            else if (this.fileType === 'xml') {
                options = {
                    rootElement: this.xmlRootElement || undefined,
                    fieldMapping: this.parseMapping(this.xmlFieldMapping)
                };
            }

            const result = await converter.convert(this.selectedFile, options);
            this.onOptionsChange.emit(options);
            this.onConvert.emit(result);
        } catch (error) {
            this.onError.emit('Hata: ' + error);
        } finally {
            this.isProcessing = false;
        }
    }

    // Option triggers
    private emitOptions(): void {
        const options = this.getCsvOptions();
        this.onOptionsChange.emit(options);
    }

    onHeaderCheckboxChange(): void { this.emitOptions(); }
    onSkipEmptyLinesChange(): void { this.emitOptions(); }
    onFieldCountChange(): void {
        const count = this.fieldCount;
        while (this.fieldConfigs.length < count) {
            const last = this.fieldConfigs[this.fieldConfigs.length - 1];
            const newStart = last ? last.start + last.length : 0;
            this.fieldConfigs.push({ start: newStart, length: 10 });
        }
        while (this.fieldConfigs.length > count) {
            this.fieldConfigs.pop();
        }
    }
    onFieldConfigChange(): void { }
    onDelimiterChange(): void { this.emitOptions(); }
    onRowDelimiterChange(): void { this.emitOptions(); }
    onQuoteOptionChange(): void {
        this.doubleQuoteWrap = this.selectedQuoteOption === 'double';
        this.emitOptions();
    }
    onEncodingChange(): void { this.emitOptions(); }
    onRowPrefixChange(): void { this.emitOptions(); }
    onRowSuffixChange(): void { this.emitOptions(); }
    onTrimWhitespaceChange(): void { this.emitOptions(); }
    onDoubleQuoteWrapChange(): void {
        this.selectedQuoteOption = this.doubleQuoteWrap ? 'double' : 'none';
        this.emitOptions();
    }
}
