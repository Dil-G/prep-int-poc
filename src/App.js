import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // Hardcoded request config
  const API_URL = 'https://prod-31.norwayeast.logic.azure.com:443/workflows/180daec8b4e24b938b34c36e0a81eabf/triggers/When_a_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_a_HTTP_request_is_received%2Frun&sv=1.0&sig=ovQt_K-FxOnuvWS3ubNDZqp-pJ3olIac5VxBqeU_Gf0';
  const METHOD = 'POST';
  const BODY_OBJECT = {
    "apis": [
        {
            "api": "enin",
            "endpoints": [
                {
                    "key": "property-composite-collection",
                    "value": {
                        "method": "GET",
                        "parameters": [
                            {
                                "key": "geo_location_uuid",
                                "value": "72d251c6-5ac7-4421-988b-4cb21a16a239"
                            },
                            {
                                "key": "include_history_flag",
                                "value": "false"
                            },
                            {
                                "key": "include_sectioned_flag",
                                "value": "true"
                            },
                            {
                                "key": "limit",
                                "value": "10"
                            },
                            {
                                "key": "offset",
                                "value": "00"
                            }
                        ]
                    }
                },
                {
                    "key": "property-right-share-composite-collection",
                    "value": {
                        "method": "GET",
                        "parameters": [
                            {
                                "key": "property_identifier",
                                "value": "f066d92f-ec87-4c57-baef-b2852a39529a"
                            }
                        ]
                    }
                }
            ]
        }
    ]
  };

  const [responseData, setResponseData] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [statusInfo, setStatusInfo] = useState(null); // { status, statusText, durationMs }

  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Editable form state based on response
  const [formData, setFormData] = useState([]);

  useEffect(() => {
    if (responseData) {
      setFormData(Array.isArray(responseData) ? responseData : [responseData]);
    } else {
      setFormData([]);
    }
  }, [responseData]);

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
  };
  // Helper to update nested fields (shallow copy array, then update)
  const handleChange = (index, key, value, nestedKey) => {
    setFormData((prev) => {
      const newData = Array.isArray(prev) ? [...prev] : [];
      if (!newData[index]) return prev;
      if (nestedKey) {
        newData[index][key][nestedKey] = value;
      } else {
        newData[index][key] = value;
      }
      return newData;
    });
  };

  const toggleExpanded = (path) => {
    setIsExpanded(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const renderValue = (value, path = '') => {
    if (value === null) {
      return <span className="null-value">null</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className="boolean-value">{value.toString()}</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="number-value">{value}</span>;
    }
    
    if (typeof value === 'string') {
      return <span className="string-value">"{value}"</span>;
    }
    
    if (Array.isArray(value)) {
      return (
        <div className="array-container">
          <span 
            className="expand-toggle"
            onClick={() => toggleExpanded(path)}
          >
            {isExpanded[path] ? '▼' : '▶'} Array [{value.length}]
          </span>
          {isExpanded[path] && (
            <div className="array-content">
              {value.map((item, index) => (
                <div key={index} className="array-item">
                  <span className="array-index">[{index}]:</span>
                  {renderValue(item, `${path}[${index}]`)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      return (
        <div className="object-container">
          <span 
            className="expand-toggle"
            onClick={() => toggleExpanded(path)}
          >
            {isExpanded[path] ? '▼' : '▶'} Object {keys.length > 0 ? `{${keys.length} properties}` : '{}'}
          </span>
          {isExpanded[path] && (
            <div className="object-content">
              {keys.map(key => (
                <div key={key} className="object-item">
                  <span className="object-key">"{key}":</span>
                  {renderValue(value[key], `${path}.${key}`)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return <span>{String(value)}</span>;
  };

  // Try to coerce plain text into JSON or array of JSON objects
  const coerceTextToJson = (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return null;

    // First try plain JSON
    try {
      return JSON.parse(trimmed);
    } catch {}

    // Try wrapping concatenated objects into an array: ...}{...} => [{...},{...}]
    try {
      const normalized = '[' + trimmed.replace(/}\s*\n?\s*{?/g, (m) => '},{').replace(/,\s*]$/,' ]') + ']';
      const arr = JSON.parse(normalized);
      if (Array.isArray(arr)) return arr;
    } catch {}

    // Try splitting by newlines and parsing each line as JSON
    try {
      const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const arr = lines.map(l => JSON.parse(l));
      if (arr.length) return arr;
    } catch {}

    // Try NDJSON separated by }{ without newline
    try {
      const parts = trimmed.split(/}\s*{+/).filter(Boolean).map((p, i, a) => {
        const s = (i > 0 ? '{' : '') + p + (i < a.length - 1 ? '}' : '');
        return JSON.parse(s);
      });
      if (parts.length) return parts;
    } catch {}

    return null;
  };

  // Form-like renderer for response data (editable)
  const renderEditableForm = () => {
    if (!formData.length) return null;

    return (
      <div style={{ padding: "20px" }}>
        {formData.map((item, index) => (
          <div key={index} style={{ marginBottom: "30px", border: "1px solid #ccc", padding: "15px", borderRadius: 8 }}>
            {Object.keys(item).map((key) => {
              const value = item[key];
              if (typeof value === "object" && value !== null) return null;
              return (
                <div key={key} style={{ marginBottom: "10px" }}>
                  <label style={{ display: 'inline-block', minWidth: 160, fontWeight: 600 }}>{key}:</label>
                  <input
                    type="text"
                    value={value ?? ''}
                    onChange={(e) => handleChange(index, key, e.target.value)}
                    style={{ marginLeft: "10px", padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', width: '60%' }}
                  />
                </div>
              );
            })}

            {item.Free_text?.details?.grunnboka && (
              <div style={{ marginTop: "10px", paddingLeft: "20px" }}>
                <h4 style={{ marginBottom: 10 }}>Grunnboka</h4>
                {Object.entries(item.Free_text.details.grunnboka).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: "10px" }}>
                    <label style={{ display: 'inline-block', minWidth: 160, fontWeight: 600 }}>{key}:</label>
                    <input
                      type="text"
                      value={value ?? ''}
                      onChange={(e) => handleChange(index, "Free_text", { ...item.Free_text, details: { ...item.Free_text.details, grunnboka: { ...item.Free_text.details.grunnboka, [key]: e.target.value } } })}
                      style={{ marginLeft: "10px", padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', width: '60%' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const beautifyKey = (key) => {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .replace(/^./, (s) => s.toUpperCase());
  };

  const formatPrimitive = (val) => {
    if (val === null) return 'null';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return String(val);
    return String(val ?? '');
  };

  const sendRequest = async () => {
    setError('');
    setResponseData(null);
    setResponseText('');
    setStatusInfo(null);

    setIsLoading(true);
    const start = performance.now();
    try {
      const res = await fetch(API_URL, {
        method: METHOD,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(BODY_OBJECT)
      });
      const durationMs = Math.round(performance.now() - start);

      setStatusInfo({ status: res.status, statusText: res.statusText, durationMs });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        setResponseData(data);
      } else {
        const text = await res.text();
        // Try parsing text as JSON; attempt coercion to array of objects if needed
        const coerced = coerceTextToJson(text);
        if (coerced !== null) {
          setResponseData(coerced);
        } else {
          setResponseText(text);
        }
      }
    } catch (err) {
      setError('Network or CORS error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>JSON API Client</h1>
        <p>Hardcoded POST request with predefined body. Click to send.</p>
      </header>
      
      <main className="App-main">
        <div className="input-section">
          <div className="input-container">
            <div className="form-row">
              <label>Request</label>
              <div className="text-response">
                <pre>{JSON.stringify({ body: BODY_OBJECT }, null, 2)}</pre>
              </div>
            </div>

            <button onClick={sendRequest} className="parse-button" disabled={isLoading}>
              {isLoading ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </div>

        {(error || statusInfo || responseData || responseText) && (
          <div className="output-section">
            <h2>Response</h2>
            {statusInfo && (
              <div className="response-meta">
                <span>Status: {statusInfo.status} {statusInfo.statusText}</span>
                <span>Time: {statusInfo.durationMs} ms</span>
              </div>
            )}

            {error && (
              <div className="error-message">
                <h3>Error:</h3>
                <p>{error}</p>
              </div>
            )}

            {responseData && (
              <>
                {renderEditableForm()}
              </>
            )}

            {!responseData && responseText && (
              <div className="text-response">
                <pre>{(() => { try { return JSON.parse(responseText)?.kommunenr; } catch { return responseText; } })()}</pre>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App; 