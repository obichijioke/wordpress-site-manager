# Custom OpenAI-Compatible AI Providers Implementation

## Overview
This document describes the implementation of custom OpenAI-compatible AI provider support in the WordPress Manager application. Users can now configure custom endpoints for OpenAI-compatible services such as Azure OpenAI, local models (like Ollama, LM Studio), or other compatible APIs.

## Changes Made

### 1. Backend API Routes (`api/routes/ai-settings.ts`)

Added four new API endpoints for managing custom models:

#### **POST /api/ai-settings/custom-models**
Creates a new custom model configuration.

**Request Body:**
```json
{
  "name": "My Custom GPT",
  "identifier": "custom-gpt-4",
  "provider": "custom",
  "endpoint": "https://api.example.com/v1",
  "apiKey": "sk-...",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Custom model created successfully",
  "customModel": { ... }
}
```

#### **PUT /api/ai-settings/custom-models/:id**
Updates an existing custom model configuration.

**Request Body:**
```json
{
  "name": "Updated Name",
  "endpoint": "https://new-endpoint.com/v1",
  "apiKey": "sk-...",
  "temperature": 0.8,
  "maxTokens": 3000,
  "isActive": true
}
```

#### **DELETE /api/ai-settings/custom-models/:id**
Deletes a custom model configuration.

**Response:**
```json
{
  "success": true,
  "message": "Custom model deleted successfully"
}
```

#### **POST /api/ai-settings/custom-models/test**
Tests the connection to a custom endpoint.

**Request Body:**
```json
{
  "endpoint": "https://api.example.com/v1",
  "apiKey": "sk-...",
  "model": "gpt-3.5-turbo"
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "message": "Connection successful"
}
```

### 2. Frontend API Client (`src/lib/ai-api.ts`)

Added TypeScript interfaces and methods for custom model management:

#### **New Interfaces:**
```typescript
export interface CustomModel {
  id: string
  name: string
  identifier: string
  provider: string
  endpoint: string
  temperature: number
  maxTokens: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCustomModelData {
  name: string
  identifier: string
  provider?: string
  endpoint: string
  apiKey: string
  temperature?: number
  maxTokens?: number
}

export interface UpdateCustomModelData {
  name?: string
  endpoint?: string
  apiKey?: string
  temperature?: number
  maxTokens?: number
  isActive?: boolean
}
```

#### **New Methods:**
- `createCustomModel(data: CreateCustomModelData): Promise<CustomModel>`
- `updateCustomModel(id: string, data: UpdateCustomModelData): Promise<CustomModel>`
- `deleteCustomModel(id: string): Promise<void>`
- `testCustomModel(endpoint: string, apiKey: string, model?: string): Promise<{ valid: boolean; message: string }>`

### 3. AI Settings Page UI (`src/pages/AISettings.tsx`)

Added a comprehensive UI section for managing custom OpenAI-compatible models:

#### **Features:**
1. **Custom Models List**
   - Displays all configured custom models
   - Shows model name, identifier, endpoint, and configuration
   - Indicates active/inactive status
   - Edit and delete actions for each model

2. **Add/Edit Custom Model Form**
   - Model Name: Display name for the model
   - Model Identifier: Unique identifier (e.g., "custom-gpt-4", "azure-gpt-35")
   - API Endpoint: OpenAI-compatible endpoint URL
   - API Key: Encrypted API key for authentication
   - Temperature: Model temperature setting (0-2)
   - Max Tokens: Maximum tokens per request
   - Test Connection: Button to verify endpoint connectivity

3. **State Management**
   - `customModels`: Array of configured custom models
   - `showCustomModelForm`: Toggle for form visibility
   - `editingCustomModel`: Currently editing model (null for new)
   - `customModelForm`: Form data state
   - `testingCustomModel`: Loading state for connection test
   - `customModelTestResult`: Test result message

4. **Handler Functions**
   - `handleTestCustomModel()`: Tests custom endpoint connection
   - `handleSaveCustomModel()`: Creates or updates custom model
   - `handleEditCustomModel(model)`: Loads model data for editing
   - `handleDeleteCustomModel(id)`: Deletes custom model with confirmation
   - `handleCancelCustomModelForm()`: Resets form and closes it

## Usage Examples

### Example 1: Azure OpenAI
```
Name: Azure GPT-4
Identifier: azure-gpt-4
Endpoint: https://your-resource.openai.azure.com/openai/deployments/gpt-4
API Key: your-azure-api-key
```

### Example 2: Local Ollama
```
Name: Local Llama 3
Identifier: ollama-llama3
Endpoint: http://localhost:11434/v1
API Key: ollama (or any value for local)
```

### Example 3: LM Studio
```
Name: LM Studio Model
Identifier: lmstudio-local
Endpoint: http://localhost:1234/v1
API Key: lm-studio
```

### Example 4: Custom OpenAI Proxy
```
Name: Custom Proxy
Identifier: custom-proxy-gpt4
Endpoint: https://your-proxy.com/v1
API Key: your-proxy-api-key
```

## Database Schema

The `CustomModel` table (already exists in `prisma/schema.prisma`):

```prisma
model CustomModel {
  id            String   @id @default(cuid())
  userId        String   @map("user_id")
  name          String
  identifier    String
  provider      String   @default("custom")
  endpoint      String
  apiKey        String   @map("api_key") // Encrypted
  temperature   Float    @default(0.7)
  maxTokens     Int      @default(2000) @map("max_tokens")
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, identifier])
  @@map("custom_models")
}
```

## Security Considerations

1. **API Key Encryption**: All API keys are encrypted using the `encryptPassword()` function before storage
2. **API Key Masking**: When retrieving settings, API keys are masked (showing only first 7 and last 4 characters)
3. **User Isolation**: Custom models are scoped to individual users via `userId`
4. **Unique Identifiers**: The `userId_identifier` unique constraint prevents duplicate model identifiers per user

## Integration with AI Service

The custom models are automatically integrated with the existing AI service:

1. Custom models appear in the available models list
2. They can be selected for any AI feature (enhance, generate, summarize, etc.)
3. The `AIService.getProvider()` method automatically routes requests to custom endpoints
4. Usage tracking works the same as built-in models

## Testing

To test the implementation:

1. Navigate to Settings page in the application
2. Scroll to "Custom OpenAI-Compatible Models" section
3. Click "Add Custom Model"
4. Fill in the form with your custom endpoint details
5. Click "Test" to verify connectivity
6. Click "Add Model" to save
7. The custom model will now appear in model selection dropdowns

## Future Enhancements

Potential improvements for future versions:

1. **Model Discovery**: Auto-detect available models from endpoint
2. **Cost Tracking**: Allow users to set custom pricing for cost calculations
3. **Model Groups**: Organize custom models into categories
4. **Import/Export**: Share custom model configurations
5. **Health Monitoring**: Track endpoint uptime and response times
6. **Advanced Settings**: Support for additional OpenAI parameters (top_p, frequency_penalty, etc.)

