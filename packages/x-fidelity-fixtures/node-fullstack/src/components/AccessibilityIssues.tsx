import React, { useState } from 'react';
import { Button, Input } from 'antd';

// This component has multiple accessibility issues that should be detected by OpenAI analysis
// Triggers openaiAnalysisA11y-global, openaiAnalysisTop5-global, openaiAnalysisTestCriticality-global

const AccessibilityIssues: React.FC = () => {
  const [value, setValue] = useState('');
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '20px' }}>
      {/* Missing heading hierarchy - skips from h1 to h3 */}
      <h1>Main Title</h1>
      <h3>Subsection (missing h2)</h3>
      
      {/* Images without alt text */}
      <img src="/placeholder.jpg" width="200" height="150" />
      <img src="/another-image.png" />
      
      {/* Forms without proper labels */}
      <div style={{ marginTop: '20px' }}>
        <input type="text" placeholder="Enter your name" />
        <input type="email" placeholder="Email address" />
        <input type="password" />
      </div>
      
      {/* Buttons without accessible names */}
      <div style={{ marginTop: '15px' }}>
        <button onClick={() => setCount(count + 1)}>+</button>
        <span>{count}</span>
        <button onClick={() => setCount(count - 1)}>-</button>
      </div>
      
      {/* Poor color contrast */}
      <div style={{ 
        backgroundColor: '#ffff00', 
        color: '#ffffff',
        padding: '10px',
        marginTop: '15px'
      }}>
        This text has poor color contrast
      </div>
      
      {/* Interactive elements without focus indicators */}
      <div 
        onClick={() => console.log('clicked')}
        style={{ 
          cursor: 'pointer',
          padding: '10px',
          backgroundColor: '#f0f0f0',
          marginTop: '10px'
        }}
      >
        Clickable div without focus indicator
      </div>
      
      {/* Links that don't describe their purpose */}
      <div style={{ marginTop: '15px' }}>
        <a href="/page1">Click here</a> | 
        <a href="/page2">Read more</a> | 
        <a href="/page3">Learn more</a>
      </div>
      
      {/* Form controls without labels */}
      <div style={{ marginTop: '20px' }}>
        <select>
          <option>Option 1</option>
          <option>Option 2</option>
        </select>
        <textarea placeholder="Comments"></textarea>
      </div>
      
      {/* Missing ARIA labels and roles */}
      <div style={{ marginTop: '15px' }}>
        <div onClick={() => setValue('modal')}>Open Modal</div>
        {value === 'modal' && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            border: '1px solid #ccc'
          }}>
            <p>Modal content without proper ARIA attributes</p>
            <button onClick={() => setValue('')}>Close</button>
          </div>
        )}
      </div>
      
      {/* Auto-playing content */}
      <video autoPlay muted loop style={{ marginTop: '15px' }}>
        <source src="/video.mp4" type="video/mp4" />
      </video>
      
      {/* Critical functionality that's hard to test */}
      <div style={{ marginTop: '20px' }}>
        <button 
          style={{
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
          onClick={() => {
            // Complex logic that would be hard to unit test
            const result = Math.random() > 0.5 ? 'success' : 'failure';
            if (result === 'success') {
              // Side effects that are hard to test
              window.location.href = '/success';
            } else {
              alert('Operation failed');
            }
          }}
        >
          Critical Action (Hard to Test)
        </button>
      </div>
    </div>
  );
};

export default AccessibilityIssues; 