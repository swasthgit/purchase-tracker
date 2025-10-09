
# Purchase Tracker Application: End-to-End Documentation

## 1. Introduction

This document provides a comprehensive overview of the **Purchase Tracker** application, detailing its architecture, features, and workflows from both a user and an administrative perspective.

The application is a web-based platform designed to streamline the process of recording and managing purchases. It features a main purchase form for data entry and a suite of powerful admin panels for data management, analytics, and configuration.

### Core Technologies
- **Frontend**: Next.js (with App Router), React, TypeScript
- **UI Components**: ShadCN UI, Radix UI
- **Styling**: Tailwind CSS
- **Database & Storage**: Google Firebase (Firestore and Cloud Storage)
- **Data & Forms**: React Hook Form, Zod for validation
- **File Handling**: `xlsx` for Excel parsing/generation

---

## 2. Page-by-Page Feature Breakdown

### 2.1. Home Page (`/`) - The Purchase Form

This is the primary data entry point of the application. Users can record new purchases here.

#### **Features:**

- **User & Partner Information**:
    - **User ID**: A searchable dropdown list of pre-approved employee IDs. This is a required field.
    - **Partner Name**: A searchable dropdown of registered partners. This is also required.
    - **Your Name**: A free-text field for the user to enter their full name.

- **Itemized Purchase List**:
    - Users can add multiple items to a single purchase record.
    - **Add Item**: Adds a new, empty item card to the form.
    - **Duplicate Last Item**: Clones the last item in the list, which is useful for adding similar items quickly.
    - **Remove Item**: Each item card has a "Remove" button.

- **Item Card Fields**:
    - **Clinic Code**: A text field to specify the clinic associated with the item.
    - **Item Name**: A searchable dropdown populated from the "Item Definitions" managed in the admin panel. It includes an "Other (Specify)" option.
    - **Custom Item Name**: Appears only when "Other" is selected, allowing for manual entry.
    - **Quantity & Price/Unit**: Numeric fields for purchase details. The line item total is calculated and displayed automatically.

- **File Uploads**:
    - A drag-and-drop or click-to-upload area for supporting documents (e.g., receipts, invoices).
    - Supports images and PDF files, with validation for file size and type.
    - Previews are generated for selected files.

- **Feedback / Grievances**:
    - A text area for users to provide any additional comments or report issues related to the purchase.

- **Submission & Bill Preview**:
    - The "Submit" button is disabled until all required fields are valid.
    - On successful submission, a **Bill Preview** dialog appears, summarizing the entire purchase.
    - From the preview, the user can **Print** the bill or **Download** it as a detailed Excel file.

#### **Workflow:**
1. User selects their ID and the partner's name.
2. User enters their own name.
3. User adds one or more items, filling in the clinic code, item name, quantity, and price for each.
4. User (optionally) uploads supporting documents and adds feedback.
5. User clicks "Submit". The data is sent to a Server Action.
6. The Server Action validates the data, uploads files to Firebase Storage, and saves the final purchase record to the Firestore `purchases` collection.
7. A success toast appears, and the Bill Preview dialog is shown.

---

### 2.2. Admin Page (`/admin`)

This page is a centralized dashboard for all administrative functions, protected by a simple login. It uses a tabbed interface to organize various management tools.

#### **Tabs & Features:**

- **Manage Employee IDs**:
    - View, add, and remove individual employee IDs.
    - Includes a "Delete All" button with a confirmation dialog for bulk clearing.

- **Manage Item Definitions**:
    - CRUD (Create, Read, Update, Delete) for all items that appear in the purchase form's dropdown.
    - Each item includes a **name**, an **image URL**, and an optional **AI Hint** (keywords for image search).
    - The interface allows for uploading images directly, which are stored in Firebase Storage.

- **Manage Partners**:
    - Simple CRUD interface for managing partner names. These populate the "Partner Name" dropdown on the main form.

- **Manage Printer Names**:
    - A simple list management interface for printer names (functionality for this data is not yet fully implemented in the UI but the management system is in place).

- **Bulk Upload Employee IDs**:
    - Allows admins to upload a `.csv` or `.xlsx` file to add multiple employee IDs at once.
    - The file can either be a single column of IDs or have a header of `employee_id` (or `employee id`).

- **DC Mapping Upload**:
    - An interface to upload a `.csv` or `.xlsx` file containing DC (Distribution Center) mapping data.
    - This data populates the public-facing DC Mapping page.

- **Download Reports**:
    - Allows an admin to select a date range and download a comprehensive Excel report of all purchases within that period.
    - The report includes detailed, item-level data for each purchase.

- **Analytics Report**:
    - A powerful data visualization tool. Admins can select a date range to generate various charts:
        - **Date-wise Summary**: Bar chart of total purchase amounts per day.
        - **Partner-wise Summary**: Bar chart showing total amounts per partner.
        - **Clinic Code & Item-wise Summary**: Pie charts showing purchase distribution.
        - **User-wise Summary**: A treemap visualizing purchase amounts by user.

- **Detailed Bill View**:
    - Displays a table of the last 50 purchase records.
    - Each record has a "View Details" button that opens the same **Bill Preview** dialog seen by the user after submission, allowing admins to inspect any recent transaction.

---

### 2.3. Inventory Page (`/inventory`)

This is a public, read-only page for viewing the current inventory status across all clinics.

#### **Features:**

- **Clinic-based Filtering**:
    - A searchable dropdown allows users to select a specific clinic.
    - The inventory table is initially empty and only populates after a clinic is selected to ensure good performance.
- **Inventory Table**:
    - Displays all items for the selected clinic.
    - Columns include: **Item Name**, **Clinic Type**, **Quantity**, **Approx Price**, and the calculated **Total Price**.

---

### 2.4. Inventory Admin Page (`/inventory-admin`)

This is a protected admin page for managing the entire inventory system.

#### **Tabs & Features:**

- **Manage Inventory**:
    - Provides full CRUD capabilities for inventory items.
    - An admin first selects a clinic from a searchable dropdown.
    - The table then displays all items for that clinic, with "Edit" and "Delete" buttons for each.
    - An "Add New Item" button allows adding new stock to the selected clinic.
    - A "Delete All" button allows for completely wiping all inventory data across all clinics (with a confirmation step).

- **Bulk Upload Inventory**:
    - An interface to upload a `.csv` or `.xlsx` file for adding or updating inventory items in bulk.
    - **Required Headers**: `clinic_name`, `item_name`, `quantity`, `price`.
    - **Optional Header**: `clinic_type`.
    - **Logic**: If an item already exists for a clinic, its details are updated. If the clinic doesn't exist, it is created automatically.

---

### 2.5. DC Mapping Page (`/dc-mapping`)

This page provides a public, searchable view of the DC Mapping data uploaded by an admin.

#### **Features:**

- **Performance-Optimized Filtering**:
    - The data table is empty on initial load to prevent browser lag.
    - **Filter by Old E-clinic**: A searchable dropdown to select a specific E-clinic and view its mapping data.
    - **Global Search**: A powerful search bar that filters across all available fields (DC Name, Branch, Employee Code, etc.).
- **Data Display**:
    - A clean, read-only table displays the filtered mapping data with columns for State, Partner, E-clinic codes, Region, Branch, and DC details.

---

## 3. Data Flow & Architecture

- **Firebase Firestore**: Acts as the primary database. It stores collections for `purchases`, `employee_ids`, `partners`, `item_definitions`, `inventory`, and `dc_mappings`. The structure is designed to be scalable, using arrays within documents (e.g., `inventory` items) where appropriate to keep related data together.
- **Firebase Storage**: Used for storing all uploaded files, such as purchase receipts (in `purchase_documents/`) and item definition images (in `item_images/`).
- **Next.js Server Actions**: The application heavily relies on Server Actions (`/lib/actions.ts`) to handle all backend logic, including form submissions, data fetching for reports, and all database CRUD operations. This centralizes logic on the server, ensuring security and consistency.
- **Data Fetching Functions**: A dedicated data layer (`/lib/data.ts`) contains all the functions for interacting directly with Firestore, separating database queries from the action logic.
- **State Management**: Client-side state is managed using React hooks (`useState`, `useEffect`) and `react-hook-form` for complex forms. A custom `useLanguage` hook provides multi-language support.
- **Component-based Architecture**: The UI is built with reusable React components located in `/src/components/`, with shared UI elements from ShadCN in `/src/components/ui/`. This makes the application maintainable and easy to extend.
