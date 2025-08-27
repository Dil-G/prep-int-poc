import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // Hardcoded request config
  const DESCRIPTION = `This process is a workflow that collects data from multiple sources and returns it in a clean, organized format. Here’s how it works:

  RECEIVING REQUESTS:
  The system starts when it receives a request from a user or another application. The request specifies which data source (like "enin") to query and provides the details of what information is needed.



  CHOOSING THE DATA SOURCE:
  The system checks which data provider is being requested. Right now, it knows how to handle "enin." If an unknown provider is requested, it returns an error or an empty result.

  PROCESSING EACH REQUEST:
  For every data endpoint specified in the request, the system does the following:
  - Figures out the exact location to retrieve the data.
  - Converts any input details into a format the system can send as a query.
  - Authenticates securely to access the data.
  - Calls the data provider and retrieves the response.

  STANDARDIZING THE DATA:
  Since different endpoints may return data in different formats, the system organizes each response into a consistent structure.


  COMBINING THE DATA:
  Once all the endpoints are processed, the system merges the individual results into one final object. This gives a single, organized view of all the requested information.

  RETURNING THE RESULTS:
  Finally, the system sends back the clean, combined data as a response in JSON format, ready for the user or application to consume.

  `;
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
  const [isLoading, setIsLoading] = useState(false);

  // Editable form state based on response
  const [formData, setFormData] = useState([]);

  // Parse DESCRIPTION into intro + sections with topics
  const parseDescription = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let intro = [];
    const sections = [];
    let current = null;
    const topicRegex = /^[A-Z0-9 \-()]+:$/;

    lines.forEach((line, idx) => {
      if (topicRegex.test(line)) {
        const title = line.replace(/:$/, '');
        current = { title, items: [] };
        sections.push(current);
        return;
      }
      if (!current) {
        intro.push(line);
      } else {
        // strip leading bullet dash
        const item = line.startsWith('- ') ? line.slice(2) : line;
        current.items.push(item);
      }
    });
    return { intro, sections };
  };

  const { intro: descriptionIntro, sections: descriptionSections } = parseDescription(DESCRIPTION);

  useEffect(() => {
    if (responseData) {
      setFormData(Array.isArray(responseData) ? responseData : [responseData]);
    } else {
      setFormData([]);
    }
  }, [responseData]);

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

  // Try to coerce plain text into JSON or array of JSON objects
  const coerceTextToJson = (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return null;

    try {
      return JSON.parse(trimmed);
    } catch {}

    try {
      const normalized = '[' + trimmed.replace(/}\s*\n?\s*{?/g, (m) => '},{').replace(/,\s*]$/,' ]') + ']';
      const arr = JSON.parse(normalized);
      if (Array.isArray(arr)) return arr;
    } catch {}

    try {
      const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const arr = lines.map(l => JSON.parse(l));
      if (arr.length) return arr;
    } catch {}

    try {
      const parts = trimmed.split(/}\s*{+/).filter(Boolean).map((p, i, a) => {
        const s = (i > 0 ? '{' : '') + p + (i < a.length - 1 ? '}' : '');
        return JSON.parse(s);
      });
      if (parts.length) return parts;
    } catch {}

    return null;
  };

  // Deep merge helper to combine multiple response items into one form
  const deepMergeObjects = (a, b) => {
    if (Array.isArray(a) || Array.isArray(b)) {
      return b ?? a;
    }
    if (a && typeof a === 'object' && b && typeof b === 'object') {
      const result = { ...a };
      Object.keys(b).forEach((key) => {
        if (key in result) {
          result[key] = deepMergeObjects(result[key], b[key]);
        } else {
          result[key] = b[key];
        }
      });
      return result;
    }
    return b ?? a;
  };

  // Form-like renderer for response data (editable)
  const renderEditableForm = () => {
    if (!formData.length) return null;

    const mergedItem = formData.reduce((acc, curr) => deepMergeObjects(acc, curr), {});
    const index = 0;

    return (
      <div style={{ padding: "20px" }}>
        <div style={{ marginBottom: "30px", border: "1px solid #ccc", padding: "15px", borderRadius: 8 }}>
          {Object.keys(mergedItem).map((key) => {
            const value = mergedItem[key];
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

          {mergedItem.Free_text?.details?.grunnboka && (
            <div style={{ marginTop: "10px" }}>
              <h4 style={{ marginBottom: 10 }}>Grunnboka</h4>
              {Object.entries(mergedItem.Free_text.details.grunnboka).map(([key, value]) => (
                <div key={key} style={{ marginBottom: "10px" }}>
                  <label style={{ display: 'inline-block', minWidth: 160, fontWeight: 600 }}>{key}:</label>
                  <input
                    type="text"
                    value={value ?? ''}
                    onChange={(e) => handleChange(index, "Free_text", { ...formData[index]?.Free_text, details: { ...(formData[index]?.Free_text?.details || {}), grunnboka: { ...(formData[index]?.Free_text?.details?.grunnboka || {}), [key]: e.target.value } } })}
                    style={{ marginLeft: "10px", padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', width: '60%' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
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
      <div className="description-section">
        <h2>Workflow overview</h2>
        {descriptionIntro.length > 0 && (
          <p style={{ marginBottom: 12 }}>{descriptionIntro.join(' ')}</p>
        )}
        {descriptionSections.map((sec, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <h3 style={{ margin: '6px 0 6px 0' }}>{sec.title}</h3>
            {sec.items.length > 0 && (
              <ul>
                {sec.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
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

          </div>
        )}
      </main>
    </div>
  );
}

export default App; 