import { Component } from "@angular/core"
import { DatabaseService } from "./services/database.service"
// Interface to define the structure of our data
interface TableData {
  [key: string]: any // This allows dynamic properties
}

// Interface for CSV parsing options
interface CsvOptions {
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
@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {


  // This will store our converted JSON data in memory
  jsonData: TableData[] = []

  // This will store the column headers from CSV
  tableHeaders: string[] = []

  // Search functionality
  searchTerm = ""


  // CSV parsing options
  csvOptions: CsvOptions = {
    hasHeader: true,
    skipEmptyLines: true,
    selectedDelimiter: ",",
    doubleQuoteWrap: true,
    selectedRowDelimiter: "newline",
    rowPrefix: "",
    rowSuffix: "",
    selectedEncoding: "utf-8",
    selectedQuoteOption: "none",
    trimWhitespace: true,
  }

  constructor(private databaseService: DatabaseService) {}


  /**
   * This method is called when CSV is successfully converted to JSON
   * @param result - The converted data from CSV uploader component
   */
  onCsvConverted(result: any): void {
    console.log("CSV converted successfully:", result)

    // Store the JSON data in memory for backend usage
    this.jsonData = result.result

    // Store the headers for table display
    this.tableHeaders = result.properties

    // Log the data that would be sent to backend
    console.log("Data ready for backend:", this.jsonData)
  }

  /**
   * This method is called when there's an error in CSV conversion
   * @param error - Error message
   */
  onConversionError(error: string): void {
    console.error("CSV conversion failed:", error)
    alert("Error: " + error)

    // Clear data on error
    this.jsonData = []
    this.tableHeaders = []
  }


  /**
   * This method is called when the user clears/removes the selected file
   */
  onFileClear(): void {
    console.log("File selection cleared - resetting table data")

    // Clear all data to return to initial state
    this.jsonData = []
    this.tableHeaders = []
    this.searchTerm = ""

    console.log("Table data cleared successfully")

    
  }

  /**
   * This method is called when CSV parsing options change
   * @param options - The current CSV parsing options
   */
  onOptionsChanged(options: CsvOptions): void {
    console.log("CSV options changed:", options)
    this.csvOptions = { ...options }
  }

  /**
   * Method to simulate sending data to backend
   * In a real application, you would make an HTTP request here
   */
  sendToBackend(): void {
    if (this.jsonData.length === 0) {
      alert("No data to send. Please upload a CSV file first.")
      return
    }

    // This is where you would make your HTTP request to the backend
    console.log("Sending to backend:", this.jsonData)

    this.databaseService.saveCsvData(this.jsonData).subscribe({
      next: (response) => {
        console.log("Data saved successfully:", response)
        alert(
          `Success! Saved ${response.insertedIds ? Object.keys(response.insertedIds).length : "unknown"} records to MongoDB`,
        )
      },
      error: (error) => {
        console.error("Error saving data:", error)
        alert("Error saving data to database: " + error.message)
      },
    })
  }

  loadFromDatabase(): void {
    this.databaseService.getCsvData().subscribe({
      next: (response) => {
        console.log("Data loaded from MongoDB:", response)
        if (response.success && response.data) {
          // You can display this data or use it as needed
          alert(`Loaded ${response.data.length} records from database`)
        }
      },
      error: (error) => {
        console.error("Error loading data:", error)
        alert("Error loading data from database: " + error.message)
      },
    })
  }
}
