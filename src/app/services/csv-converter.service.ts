import { Injectable } from "@angular/core"
import { convertToUTF8 } from "src/app/utils/encoding-maps"

export interface CsvOptions {
  hasHeader: boolean
  skipEmptyLines: boolean
  selectedDelimiter: string
  doubleQuoteWrap: boolean
  selectedRowDelimiter: string
  rowPrefix: string
  rowSuffix: string
  selectedEncoding: string
  selectedQuoteOption: string
  trimWhitespace: boolean
}

@Injectable({ providedIn: "root" })
export class CsvConverterService {
  async convertFileToJson(file: File, options: CsvOptions): Promise<any> {
    //dosya yukleme /donusum ıslemlerı asenkron ılerler
    const arrayBuffer = await file.arrayBuffer() //fıle'ı array buffer olarak donduruyor
    const csvContent = convertToUTF8(arrayBuffer, options.selectedEncoding) //dogru encodıng ıle strınge cevırıyor. bu metod encodıng mapste
    return this.parseCsvToJson(csvContent, options)
  }

  hasPrefixAndSuffix(options: CsvOptions): boolean {
    //row prefix veya suffix'e bir şey girilmiş mi diye kontrol ediyor
    return options.rowPrefix.trim() !== "" || options.rowSuffix.trim() !== ""
  }

  quoteCharacter(options: CsvOptions): string {
    switch (options.selectedQuoteOption) {
      case "single":
        return "'"
      case "double":
        return '"'
      case "none":
      default:
        return ""
    }
  }
  //quote handling enabled mı değil mi
  isQuoteHandlingEnabled(options: CsvOptions): boolean {
    return options.selectedQuoteOption !== "none"
  }


  private parseCsvToJson(csvContent: string, options: CsvOptions): any {
    let allLines: string[]

    // Always start with basic row splitting based on row delimiter
    if (options.selectedRowDelimiter === "newline") {
      console.log("Using newline row delimiter")
      allLines = csvContent.split(/\r?\n/)
    } else if (options.selectedRowDelimiter === "carriage-return") {
      console.log("Using carriage return row delimiter")
      allLines = csvContent.split(/\r/)
    } else if (options.selectedRowDelimiter === "crlf") {
      console.log("Using carriage return + newline row delimiter")
      allLines = csvContent.split(/\r\n/)
    } else {
      console.log(`Using custom row delimiter: "${options.selectedRowDelimiter}"`)
      // Handle custom row delimiter
      const rowDelimiter = options.selectedRowDelimiter === "\t" ? "\t" : options.selectedRowDelimiter
      allLines = csvContent.split(rowDelimiter)
    }

    // Filter out completely empty lines
    allLines = allLines.filter((line) => line.trim() !== "")

    // If prefix/suffix are provided, separate header and data lines
    if (this.hasPrefixAndSuffix(options)) {
      console.log(`Filtering lines with prefix/suffix: "${options.rowPrefix}" ... "${options.rowSuffix}"`)

      const headerLine = options.hasHeader ? allLines[0] : null
      const dataLines = allLines.slice(options.hasHeader ? 1 : 0)

      // Filter only data lines for prefix/suffix pattern
      const filteredDataLines = dataLines.filter((line) => {
        const trimmedLine = line.trim()
        return trimmedLine.includes(options.rowPrefix) && trimmedLine.includes(options.rowSuffix)
      })

      // Reconstruct allLines with header (if exists) + filtered data lines
      allLines = headerLine ? [headerLine, ...filteredDataLines] : filteredDataLines

      console.log(`Found ${filteredDataLines.length} data lines matching prefix/suffix pattern`)
    }

    if (allLines.length === 0) {
      throw new Error("No data found in file with current parsing settings")
    }

    console.log("Raw lines:", allLines)

    let headers: string[]
    let dataLines: string[] = []

    // HEADER LOGIC
    if (options.hasHeader) {
      console.log("Using first line as headers")
      let headerValues = this.parseCSVLine(allLines[0], options)

      // Clean prefix/suffix from header values only if the header actually contains the pattern
      if (this.hasPrefixAndSuffix(options) || this.rowContainsPrefixSuffix(allLines[0], options)) {
        headerValues = this.cleanPrefixSuffixFromRow(headerValues, options)
      }

      if (options.trimWhitespace) {
        headerValues = headerValues.map((header) => header.trim())
      }
      headers = headerValues
      dataLines = allLines.slice(1)
    } else {
      console.log("Generating generic column names")
      const firstDataRow = allLines.find((line) => line.trim() !== "")
      if (!firstDataRow) {
        throw new Error("No data found in CSV file")
      }
      let firstRowValues = this.parseCSVLine(firstDataRow, options)

      // Clean prefix/suffix to get accurate column count
      if (this.hasPrefixAndSuffix(options)) {
        firstRowValues = this.cleanPrefixSuffixFromRow(firstRowValues, options)
      }

      const columnCount = firstRowValues.length
      headers = Array.from({ length: columnCount }, (_, idx) => `column${idx + 1}`)
      dataLines = allLines // Use all lines as data when no header
    }

    console.log("Headers:", headers)

    // Convert data lines to JSON objects
    const jsonArray: any[] = []

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i]

      if (line.trim() === "") continue

      if (options.skipEmptyLines && this.isEmptyRow(line, options)) {
        continue
      }

      // Parse line normally
      let values = this.parseCSVLine(line, options)

      console.log(`Row ${i + 1} before cleaning:`, values)

      // Clean prefix/suffix from first and last columns if they exist
      if (this.hasPrefixAndSuffix(options)) {
        values = this.cleanPrefixSuffixFromRow(values, options)
        console.log(`Row ${i + 1} after cleaning:`, values)
      }

      if (values.length > headers.length) {
        throw new Error(
          `Row ${i + 1} contains more columns (${values.length}) than expected (${headers.length}). Please check if your data contains unescaped quotes or delimiters.`,
        )
      }

      while (values.length < headers.length) {
        values.push("")
      }

      const obj: any = {}
      headers.forEach((header, index) => {
        let value = values[index] || ""
        if (options.trimWhitespace) {
          value = value.trim()
        }
        obj[header] = value
      })
      jsonArray.push(obj)
    }

    return {
      properties: headers,
      result: jsonArray,
    }
  }

  /**
   * Clean prefix from first column and suffix from last column
   */
  private cleanPrefixSuffixFromRow(values: string[], options: CsvOptions): string[] {
    if (values.length === 0) return values

    const cleanedValues = [...values]

    console.log(`Cleaning prefix "${options.rowPrefix}" and suffix "${options.rowSuffix}" from:`, values)

    // Clean prefix from first column only if it actually starts with the prefix
    if (options.rowPrefix.trim() !== "" && cleanedValues[0] && cleanedValues[0].startsWith(options.rowPrefix)) {
      cleanedValues[0] = cleanedValues[0].substring(options.rowPrefix.length)
    }

    // Clean suffix from last column only if it actually ends with the suffix
    if (options.rowSuffix.trim() !== "" && cleanedValues[cleanedValues.length - 1]) {
      const lastIndex = cleanedValues.length - 1
      if (cleanedValues[lastIndex].endsWith(options.rowSuffix)) {
        cleanedValues[lastIndex] = cleanedValues[lastIndex].substring(
          0,
          cleanedValues[lastIndex].length - options.rowSuffix.length,
        )
        console.log(`Removed suffix from last column: "${cleanedValues[lastIndex]}"`)
      }
    }

    console.log(`Final cleaned values:`, cleanedValues)
    return cleanedValues
  }

  private parseCSVLine(line: string, options: CsvOptions): string[] {
    if (!this.isQuoteHandlingEnabled(options)) {
      return line.split(options.selectedDelimiter)
    }

    // Complex parsing for quote handling
    const result: string[] = []
    let current = ""
    let inQuotes = false
    let i = 0
    const quoteChar = this.quoteCharacter(options)

    while (i < line.length) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === quoteChar && !inQuotes) {
        inQuotes = true
      } else if (char === quoteChar && inQuotes) {
        if (nextChar === quoteChar) {
          current += quoteChar
          i++
        } else {
          inQuotes = false
        }
      } else if (char === options.selectedDelimiter && !inQuotes) {
        result.push(current)
        current = ""
      } else {
        current += char
      }
      i++
    }

    result.push(current)
    return result
  }

  private isEmptyRow(line: string, options: CsvOptions): boolean {
    if (!this.isQuoteHandlingEnabled(options)) {
      const values = line.split(options.selectedDelimiter)
      const hasContent = values.some((value) => {
        const trimmed = value.trim()
        return trimmed !== "" && trimmed !== '""' && trimmed !== "''"
      })
      return !hasContent
    } else {
      const values = this.parseCSVLine(line, options)
      const hasContent = values.some((value) => value.trim() !== "")
      return !hasContent
    }
  }

  /**
   * Check if a row contains the specified prefix and suffix pattern
   */
  private rowContainsPrefixSuffix(line: string, options: CsvOptions): boolean {
    if (!this.hasPrefixAndSuffix(options)) {
      return false
    }

    const trimmedLine = line.trim()
    return trimmedLine.includes(options.rowPrefix) || trimmedLine.includes(options.rowSuffix)
  }
}
