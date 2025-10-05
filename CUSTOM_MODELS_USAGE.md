# Using Custom AI Models

## Overview

The WordPress Manager now supports custom OpenAI-compatible AI models alongside the built-in OpenAI and Anthropic providers. This allows you to use:

- **Azure OpenAI** deployments
- **Local models** (Ollama, LM Studio, LocalAI)
- **Custom API proxies**
- **Alternative providers** with OpenAI-compatible APIs

## Setup Instructions

### Step 1: Add a Custom Model

1. Navigate to **Settings** page
2. Scroll to the **"Custom OpenAI-Compatible Models"** section
3. Click **"Add Custom Model"**
4. Fill in the form:
   - **Name**: Display name (e.g., "My Ollama Model")
   - **Identifier**: Unique ID (e.g., "ollama-llama2")
   - **Provider**: Type (e.g., "ollama", "azure", "custom")
   - **Endpoint**: API URL (e.g., "http://localhost:11434/v1")
   - **API Key**: Your API key (or dummy key for local models)
   - **Temperature**: 0.0 - 1.0 (default: 0.7)
   - **Max Tokens**: Maximum response length (default: 2000)
5. Click **"Test"** to verify the connection
6. Click **"Save"** to add the model

### Step 2: Select Custom Model for Features

1. In the **Settings** page, scroll to **"Model Selection"**
2. For each AI feature (Enhance, Generate, Summarize, etc.):
   - Open the dropdown
   - Your custom models will appear at the bottom of the list
   - Select your custom model
3. Click **"Save Settings"** at the bottom

### Step 3: Use AI Features

1. Go to the **Content** page
2. The **AI Assistant Panel** will now use your selected custom models
3. All AI features will work with your custom models

## How It Works

### Model Selection Priority

When you use an AI feature, the system:

1. **Checks the feature's selected model** (e.g., `enhanceModel`)
2. **Looks for a custom model** with that identifier
3. **If found**, uses the custom model's endpoint and API key
4. **If not found**, uses the built-in OpenAI/Anthropic model

### Example Configuration

**Scenario**: You want to use Ollama for content enhancement but OpenAI for generation.

1. Add custom model:
   - Name: "Ollama Llama 2"
   - Identifier: "ollama-llama2"
   - Endpoint: "http://localhost:11434/v1"
   
2. In Model Selection:
   - Content Enhancement: Select "Ollama Llama 2"
   - Content Generation: Select "GPT-4 Turbo"

3. Result:
   - Enhance feature → Uses Ollama
   - Generate feature → Uses OpenAI

## Supported Providers

### Ollama (Local)

```
Endpoint: http://localhost:11434/v1
API Key: ollama (any value works)
Identifier: ollama-<model-name>
```

### Azure OpenAI

```
Endpoint: https://<resource>.openai.azure.com/openai/deployments/<deployment>/
API Key: <your-azure-key>
Identifier: azure-<deployment-name>
```

### LM Studio (Local)

```
Endpoint: http://localhost:1234/v1
API Key: lm-studio (any value works)
Identifier: lmstudio-<model-name>
```

### LocalAI (Local)

```
Endpoint: http://localhost:8080/v1
API Key: local (any value works)
Identifier: localai-<model-name>
```

## Troubleshooting

### Error: "OpenAI API key not configured"

**Cause**: You haven't selected a custom model for the feature, and no OpenAI API key is configured.

**Solution**: 
- Option 1: Add your OpenAI API key in Settings
- Option 2: Select a custom model for each feature in Model Selection

### Error: "Custom model not found"

**Cause**: The selected model identifier doesn't match any active custom model.

**Solution**:
1. Go to Settings → Custom Models
2. Verify the model is active (not deleted)
3. Check the identifier matches exactly
4. Re-select the model in Model Selection

### Error: "Connection failed"

**Cause**: Cannot connect to the custom endpoint.

**Solution**:
1. Verify the endpoint URL is correct
2. Check if the service is running (for local models)
3. Test the connection using the "Test" button
4. Check firewall/network settings

## Best Practices

1. **Use descriptive identifiers**: `ollama-llama2` instead of `model1`
2. **Test before saving**: Always click "Test" to verify connectivity
3. **Set appropriate limits**: Adjust temperature and max tokens for your use case
4. **Monitor costs**: Custom models may have different pricing
5. **Keep API keys secure**: Never share your API keys

## API Integration

Custom models are automatically included in the available models list:

```typescript
// Frontend
const models = await aiClient.getAvailableModels()
// Returns: [...built-in models, ...custom models]

// Backend
// Custom models are checked first, then built-in models
const provider = await AIService.getProvider(userId, modelIdentifier)
```

## Security

- API keys are **encrypted** before storage
- Keys are **masked** in the UI (showing only first 7 and last 4 characters)
- Custom models are **user-scoped** (users can only access their own models)
- Endpoints are **validated** before saving

## Limitations

1. Custom models must be **OpenAI-compatible** (support the same API format)
2. Cost tracking may not be accurate for custom models (shows $0)
3. Context window information is not available for custom models
4. Some advanced features may not work with all custom providers

