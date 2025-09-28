# 🚨 AI Bot Not Responding - DEBUGGING CHECKLIST

## ❌ **Current Issue: "Bot Not Answering"**

Your bot is not responding properly. Here's a systematic debugging approach:

## 🔍 **Quick Diagnosis Commands**

Run these in PowerShell to identify the issue:

### **1. Check Backend Status**
```powershell
# Test if backend is running
try { 
  $response = Invoke-WebRequest -Uri "http://localhost:8000" -Method GET -TimeoutSec 5
  Write-Host "✅ Backend: Running"
} catch { 
  Write-Host "❌ Backend: Down - $($_.Exception.Message)"
}
```

### **2. Check Frontend Status**  
```powershell
# Test if frontend is running
try { 
  $response = Invoke-WebRequest -Uri "http://localhost:3001" -Method GET -TimeoutSec 5
  Write-Host "✅ Frontend: Running"
} catch { 
  Write-Host "❌ Frontend: Down - $($_.Exception.Message)"
}
```

### **3. Test AI Endpoint Directly**
```powershell
# Test backend AI endpoint
$testData = @{
  message = "test"
  stockData = @(@{date="2024-01-01";open=100;high=105;low=98;close=102;volume=1000000})
  stockSymbol = "TEST"
} | ConvertTo-Json -Depth 3

try { 
  $response = Invoke-WebRequest -Uri "http://localhost:8000/api/ai/analyze" -Method POST -Body $testData -ContentType "application/json" -TimeoutSec 15
  $result = $response.Content | ConvertFrom-Json
  Write-Host "✅ Backend AI: Working - Source: $($result.source)"
} catch { 
  Write-Host "❌ Backend AI: Failed - $($_.Exception.Message)"
}
```

### **4. Test Frontend API Route**
```powershell
# Test Next.js API proxy
try { 
  $response = Invoke-WebRequest -Uri "http://localhost:3001/api/ai/analyze" -Method POST -Body $testData -ContentType "application/json" -TimeoutSec 15
  Write-Host "✅ Frontend API: Working"
} catch { 
  Write-Host "❌ Frontend API: Failed - $($_.Exception.Message)"
}
```

## 🛠️ **Likely Issues & Solutions**

### **Issue 1: Backend Not Running**
```bash
# Solution: Start backend with Gemini API key
cd "C:\Users\HP\raksh\TheNZT_Open_Source"
$env:GEMINI_API_KEY="AIzaSyDfbuHrcmuNB1DcmRmAp8sgP8L9lW3jF9c"
$env:PYTHONPATH="C:\Users\HP\raksh\TheNZT_Open_Source"
uvicorn src.backend.app:app --host 0.0.0.0 --port 8000
```

### **Issue 2: Frontend Not Running**
```bash
# Solution: Start frontend
cd "C:\Users\HP\raksh\TheNZT_Open_Source\src\frontend"
npm run dev
```

### **Issue 3: AI Endpoint Missing**
The AI endpoint might not be registered. Check FastAPI docs:
- Visit: `http://localhost:8000/docs`
- Look for `/api/ai/analyze` endpoint
- If missing, backend restart required

### **Issue 4: Environment Variables**
Backend needs Gemini API key:
```bash
# Set environment variable
$env:GEMINI_API_KEY="AIzaSyDfbuHrcmuNB1DcmRmAp8sgP8L9lW3jF9c"

# Or add to backend .env file:
echo 'GEMINI_API_KEY=AIzaSyDfbuHrcmuNB1DcmRmAp8sgP8L9lW3jF9c' >> src/backend/.env
```

### **Issue 5: CORS Problems**
If browser shows CORS errors:
- Check browser console (F12)
- Ensure backend CORS is configured
- Frontend should proxy through Next.js API route

## 🚀 **Complete Restart Procedure**

If nothing works, do a complete restart:

### **Step 1: Kill All Processes**
```powershell
# Kill any existing processes
Get-Process | Where-Object {$_.ProcessName -like "*uvicorn*" -or $_.ProcessName -like "*node*"} | Stop-Process -Force
```

### **Step 2: Restart Backend**
```powershell
cd "C:\Users\HP\raksh\TheNZT_Open_Source"
$env:GEMINI_API_KEY="AIzaSyDfbuHrcmuNB1DcmRmAp8sgP8L9lW3jF9c"
$env:PYTHONPATH="C:\Users\HP\raksh\TheNZT_Open_Source"
Start-Process powershell -ArgumentList "-Command", "uvicorn src.backend.app:app --host 0.0.0.0 --port 8000"
```

### **Step 3: Wait & Test Backend**
```powershell
Start-Sleep -Seconds 10
Invoke-WebRequest -Uri "http://localhost:8000/docs"  # Should work
```

### **Step 4: Restart Frontend**  
```powershell
cd "C:\Users\HP\raksh\TheNZT_Open_Source\src\frontend"
Start-Process powershell -ArgumentList "-Command", "npm run dev"
```

### **Step 5: Test Complete Flow**
1. Go to: `http://localhost:3001/technical-analysis`
2. Load stock data (AAPL, TSLA, etc.)
3. Ask: "What's the trend?"
4. Should get Gemini AI response

## 🔧 **Browser Testing**

### **Test in Browser Console (F12):**
```javascript
// Test frontend API directly
fetch('/api/ai/analyze', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    message: 'test',
    stockData: [{date:'2024-01-01',open:100,high:105,low:98,close:102,volume:1000000}],
    stockSymbol: 'TEST'
  })
})
.then(r => r.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
```

## 📊 **Expected Response Format**

A working response should look like:
```json
{
  "message": "📊 **Technical Analysis for AAPL**...",
  "chartUpdates": [],
  "success": true,
  "source": "backend-gemini"  // This indicates Gemini AI is working
}
```

If `source` is `"backend-local"` or `"local"`, then Gemini API is not working properly.

## 🎯 **Next Steps**

1. Run the diagnostic commands above
2. Identify which component is failing
3. Apply the appropriate solution
4. Test the complete flow
5. If still not working, check browser console for JavaScript errors

The most common issue is that the backend crashes or doesn't have the Gemini API key properly loaded.