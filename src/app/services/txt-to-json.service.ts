import { Injectable } from '@angular/core';

export interface TxtToJsonOptions {
  fieldCount: number;
  startPositions: number[];
  lengths: number[];
  hasHeader: boolean;
  skipEmptyLines: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TxtToJsonService {

  convert(txt: string, options: TxtToJsonOptions): any[] {
    let lines = txt
      .split(/\r?\n|\r/)
      .map(line => line.trim());


    if (options.skipEmptyLines) {
      lines = lines.filter(line => line.length > 0);
    }

    let dataLines = [...lines];
    let headers: string[];

    if (options.hasHeader) {
      const headerLine = dataLines.shift()!;
      headers = this.extractFields(headerLine, options);
    } else {
      headers = Array.from({ length: options.fieldCount }, (V,i) => `Field${i + 1}`);
    }

    return dataLines.map(line => {
      const fields = this.extractFields(line, options);
      const obj: any = {};
      headers.forEach((key, i) => obj[key] = fields[i]); //MONGO DB
      return obj;
    });
  }

  private extractFields(line: string, options: TxtToJsonOptions): string[] {
        const fields: string[] = [];

        // HATA KONTROL: �lk alan say�ysa isim yerine maa� yaz�lm�� olabilir
        const suspectedFirstField = line.substring(options.startPositions[0], options.startPositions[0] + options.lengths[0]).trim();
        if (/^\d+$/.test(suspectedFirstField)) {
            // Kay�p isim oldu�u d���n�l�rse sat�r� sa�a kayd�rarak d�zelt
            line = " ".repeat(options.lengths[0]) + line; // ba�a bo�luk ekle
        }

        for (let i = 0; i < options.fieldCount; i++) {
            const start = options.startPositions[i];
            const len = options.lengths[i];
            fields.push(line.substring(start, start + len).trim());
        }

        return fields;
    }


}
