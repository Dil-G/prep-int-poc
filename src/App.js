import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // Hardcoded request config
  const DESCRIPTION = `This workflow consolidates data from multiple sources and delivers it in a structured, well-organized format.
 
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

  // Predefined API/endpoint/parameter options
  const API_OPTIONS = [
    {
      api: "enin",
      endpoints: [
        {
          key: "property-composite-collection",
          parameters: [
            { key: "geo_location_uuid", label: "Geo Location UUID", default: "72d251c6-5ac7-4421-988b-4cb21a16a239" },
            { key: "include_history_flag", label: "Include History", default: "false" },
            { key: "include_sectioned_flag", label: "Include Sectioned", default: "true" },
            { key: "limit", label: "Limit", default: "10" },
            { key: "offset", label: "Offset", default: "00" }
          ]
        },
        {
          key: "property-right-share-composite-collection",
          parameters: [
            { key: "property_identifier", label: "Property Identifier", default: "f066d92f-ec87-4c57-baef-b2852a39529a" }
          ]
        }
      ]
    }
    // Add more APIs here if needed
  ];

  // State for dynamic request builder
  const [selectedApi, setSelectedApi] = useState(API_OPTIONS[0].api);
  const [selectedEndpoints, setSelectedEndpoints] = useState([
    { endpointKey: API_OPTIONS[0].endpoints[0].key, params: {} }
  ]);

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

  // Helper to get endpoints for selected API
  const getEndpointsForApi = (api) => {
    const found = API_OPTIONS.find(a => a.api === api);
    return found ? found.endpoints : [];
  };

  // UI for selecting API, endpoints, and parameters
  const renderRequestBuilder = () => {
    const endpoints = getEndpointsForApi(selectedApi);

    return (
      <div style={{ marginBottom: 20 }}>
        <div>
          <label style={{ fontWeight: 600 }}>API: ( Enin API is integrated for the POC) </label>
          <select
            value={selectedApi}
            onChange={e => {
              setSelectedApi(e.target.value);
              setSelectedEndpoints([{ endpointKey: getEndpointsForApi(e.target.value)[0].key, params: {} }]);
            }}
          >
            {API_OPTIONS.map(opt => (
              <option key={opt.api} value={opt.api}>{opt.api}</option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={{ fontWeight: 600 }}>Endpoints: (Two Endpoints of Enin are integrated for the POC)</label>
          {selectedEndpoints.map((ep, idx) => {
            const endpointOptions = endpoints;
            const endpoint = endpointOptions.find(e => e.key === ep.endpointKey);
            return (
              <div key={idx} style={{ border: '1px solid #190e0eff', padding: 10, margin: '10px 0', borderRadius: 8 }}>
                Select the Endpoint from the following dropdown options:
                <select
                  value={ep.endpointKey}
                  onChange={e => {
                    const newKey = e.target.value;
                    setSelectedEndpoints(prev => prev.map((item, i) =>
                      i === idx ? { endpointKey: newKey, params: {} } : item
                    ));
                  }}
                >
                  {endpointOptions.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.key}</option>
                  ))}
                </select>

                <div style={{ marginTop: 8 }}>
                  {endpoint && endpoint.parameters.map(param => (
                    <div key={param.key} style={{ marginBottom: 6 }}>
                      <label style={{ minWidth: 140, display: 'inline-block' }}>{param.label}:</label>
                      <input
                        type="text"
                        value={ep.params[param.key] ?? param.default}
                        onChange={e => {
                          const value = e.target.value;
                          setSelectedEndpoints(prev => prev.map((item, i) =>
                            i === idx
                              ? { ...item, params: { ...item.params, [param.key]: value } }
                              : item
                          ));
                        }}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ccc' }}
                      />
                    </div>
                  ))}
                </div>
                  <button
                    style={{
                      marginTop: 8,
                      padding: '8px 18px',
                      background: '#d21957ff',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(25, 118, 210, 0.08)',
                      transition: 'background 0.2s'
                    }}
                  onClick={() => setSelectedEndpoints(prev => prev.filter((_, i) => i !== idx))}
                  disabled={selectedEndpoints.length === 1}
                >Remove Endpoint</button>
              </div>
            );
          })}
          <button
            style={{
              marginTop: 8,
              padding: '8px 18px',
              background: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.08)',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#1565c0')}
            onMouseOut={e => (e.currentTarget.style.background = '#1976d2')}
            onClick={() => {
              const endpoints = getEndpointsForApi(selectedApi);
              setSelectedEndpoints(prev => [
                ...prev,
                { endpointKey: endpoints[0].key, params: {} }
              ]);
            }}
          >
            Add Endpoint
          </button>
        </div>
      </div>
    );
  };

  // Build request body from UI selections
  const buildRequestBody = () => ({
    apis: [
      {
        api: selectedApi,
        endpoints: selectedEndpoints.map(ep => {
          const endpointDef = getEndpointsForApi(selectedApi).find(e => e.key === ep.endpointKey);
          return {
            key: ep.endpointKey,
            value: {
              method: "GET",
              parameters: endpointDef.parameters.map(param => ({
                key: param.key,
                value: ep.params[param.key] ?? param.default
              }))
            }
          };
        })
      }
    ]
  });

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
                  onChange={(e) => {
                    setFormData(prev => {
                      const next = Array.isArray(prev) ? [...prev] : [];
                      if (!next[index]) return prev;
                      next[index] = { ...next[index], [key]: e.target.value };
                      return next;
                    })
                  }}
                  style={{ marginLeft: "10px", padding: '8px 10px', borderRadius: 8, border: '3px solid #ddd', width: '60%' }}
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
                    onChange={(e) => {
                      setFormData(prev => {
                        const next = Array.isArray(prev) ? [...prev] : [];
                        if (!next[index]) return prev;
                        const ft = { ...(next[index].Free_text || {}) };
                        const det = { ...(ft.details || {}) };
                        const gr = { ...(det.grunnboka || {}) };
                        gr[key] = e.target.value;
                        det.grunnboka = gr;
                        ft.details = det;
                        next[index] = { ...next[index], Free_text: ft };
                        return next;
                      })
                    }}
                    style={{ marginLeft: "10px", padding: '8px 10px', borderRadius: 8, border: '3px solid #ddd', width: '60%' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Send request using dynamic body
  const sendRequest = async () => {
    setError('');
    setResponseData(null);
    setResponseText('');
    setStatusInfo(null);

    let bodyToSend = buildRequestBody();

    setIsLoading(true);
    const start = performance.now();
    try {
      const res = await fetch(API_URL, {
        method: METHOD,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyToSend)
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
      <header className="App-header">
        <h1>The Prep Integration Data</h1>
        <p>Build your request by selecting APIs, endpoints, and parameters.</p>
        <p>An explanation of how this works is provided at the end</p>
      </header>
      <main className="App-main">
        <div className="input-section">
          <div className="input-container">
            {renderRequestBuilder()}
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

            {responseText && !responseData && (
              <div className="text-response">
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{responseText}</pre>
              </div>
            )}
          </div>
        )}
      </main>
      <div className="description-section" style={{ marginTop: '20px' }}>
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
    </div>
  );
}

export default App;