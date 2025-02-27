---
sidebar_position: 1
---

# Migration Dashboard Example

This example shows how to create a dashboard to track library migration progress using x-fidelity and common visualization tools.

## Setup

### 1. Configure x-fidelity

Create a custom archetype for migration tracking:

```json
// migration-tracking.json
{
    "name": "migration-tracking",
    "rules": [
        "reactHooksMigration-global",
        "typescriptAdoption-global",
        "loggingFrameworkMigration-global"
    ],
    "operators": [
        "globalPatternRatio",
        "globalPatternCount"
    ],
    "facts": [
        "globalFileAnalysis"
    ],
    "config": {
        "minimumDependencyVersions": {
            "react": ">=17.0.0"
        },
        "standardStructure": {},
        "blacklistPatterns": [
            ".*\\/\\..*",
            ".*\\.(log|lock)$",
            ".*\\/(dist|build|node_modules)(\\/.*|$)"
        ],
        "whitelistPatterns": [
            ".*\\.(ts|tsx|js|jsx)$"
        ]
    }
}
```

### 2. Set Up Telemetry Collection

Configure x-fidelity to send telemetry to your collection endpoint:

```bash
xfidelity . -a migration-tracking -t https://telemetry.example.com
```

### 3. Create Data Processing Script

Create a script to process the telemetry data:

```javascript
// process-migration-data.js
const fs = require('fs');

// Read telemetry data
const telemetryData = JSON.parse(fs.readFileSync('telemetry.json', 'utf8'));

// Extract migration metrics
const migrations = {};
telemetryData.forEach(event => {
    if (event.eventType === 'warning' && event.metadata.migrationId) {
        const { migrationId, currentRatio, totalPatterns } = event.metadata;
        
        if (!migrations[migrationId]) {
            migrations[migrationId] = [];
        }
        
        migrations[migrationId].push({
            timestamp: event.timestamp,
            ratio: currentRatio / totalPatterns,
            total: totalPatterns
        });
    }
});

// Generate dashboard data
const dashboardData = Object.keys(migrations).map(id => ({
    id,
    data: migrations[id].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    current: migrations[id].slice(-1)[0]?.ratio || 0,
    target: id === 'react-hooks-migration' ? 0.7 : 
           id === 'typescript-adoption' ? 0.5 : 0.9
}));

fs.writeFileSync('dashboard-data.json', JSON.stringify(dashboardData, null, 2));
```

## Dashboard Implementation

### Using Grafana

1. Set up a Grafana instance
2. Create a PostgreSQL or InfluxDB data source
3. Import the migration data
4. Create a dashboard with:
   - Time series graphs showing migration progress
   - Gauge panels showing current vs target ratios
   - Tables showing files needing migration

### Example Dashboard Configuration

```json
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": "-- Grafana --",
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "type": "dashboard"
      }
    ]
  },
  "editable": true,
  "gnetId": null,
  "graphTooltip": 0,
  "id": 1,
  "links": [],
  "panels": [
    {
      "datasource": null,
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "drawStyle": "line",
            "fillOpacity": 10,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "lineInterpolation": "linear",
            "lineWidth": 2,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "never",
            "spanNulls": true,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "line"
            }
          },
          "mappings": [],
          "max": 1,
          "min": 0,
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "red",
                "value": null
              },
              {
                "color": "yellow",
                "value": 0.5
              },
              {
                "color": "green",
                "value": 0.7
              }
            ]
          },
          "unit": "percentunit"
        },
        "overrides": []
      },
      "gridPos": {
        "h": 9,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "id": 2,
      "options": {
        "legend": {
          "calcs": [
            "lastNotNull",
            "max"
          ],
          "displayMode": "table",
          "placement": "bottom"
        },
        "tooltip": {
          "mode": "single"
        }
      },
      "pluginVersion": "8.0.6",
      "targets": [
        {
          "format": "time_series",
          "group": [],
          "metricColumn": "none",
          "rawQuery": true,
          "rawSql": "SELECT\n  timestamp AS \"time\",\n  ratio\nFROM migration_metrics\nWHERE\n  migration_id = 'react-hooks-migration'\nORDER BY timestamp",
          "refId": "A"
        }
      ],
      "title": "React Hooks Migration Progress",
      "type": "timeseries"
    }
  ],
  "refresh": false,
  "schemaVersion": 30,
  "style": "dark",
  "tags": [],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-30d",
    "to": "now"
  },
  "timepicker": {},
  "timezone": "",
  "title": "Library Migration Dashboard",
  "uid": "migration",
  "version": 1
}
```

## Team Progress Tracking

To track migration progress across different teams:

1. Add team information to your repository structure or configuration
2. Modify the telemetry collection to include team data:

```json
"event": {
    "type": "warning",
    "params": {
        "message": "Migration in progress",
        "metadata": {
            "migrationId": "react-hooks-migration",
            "team": "frontend-team-a",
            "currentRatio": {
                "fact": "apiMigrationAnalysis.summary.newPatternsTotal"
            },
            "totalPatterns": {
                "fact": "apiMigrationAnalysis.summary.totalMatches"
            }
        }
    }
}
```

3. Create team-specific visualizations in your dashboard

## Automated Reports

Generate automated reports for stakeholders:

```javascript
// generate-report.js
const fs = require('fs');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

async function generateReport() {
    const data = JSON.parse(fs.readFileSync('dashboard-data.json', 'utf8'));
    
    // Generate charts
    const width = 800;
    const height = 400;
    const chartCallback = (ChartJS) => {
        ChartJS.defaults.global.defaultFontColor = '#666';
    };
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });
    
    for (const migration of data) {
        const chartData = {
            labels: migration.data.map(d => new Date(d.timestamp).toLocaleDateString()),
            datasets: [{
                label: `${migration.id} Progress`,
                data: migration.data.map(d => d.ratio * 100),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        };
        
        const configuration = {
            type: 'line',
            data: chartData,
            options: {
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        ticks: {
                            callback: (value) => `${value}%`
                        }
                    }
                },
                plugins: {
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                yMin: migration.target * 100,
                                yMax: migration.target * 100,
                                borderColor: 'rgb(255, 99, 132)',
                                borderWidth: 2,
                                label: {
                                    content: `Target: ${migration.target * 100}%`,
                                    enabled: true
                                }
                            }
                        }
                    }
                }
            }
        };
        
        const image = await chartJSNodeCanvas.renderToBuffer(configuration);
        fs.writeFileSync(`${migration.id}-chart.png`, image);
    }
    
    // Generate HTML report
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Migration Progress Report</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
            .chart { margin-bottom: 40px; }
            .progress-bar { height: 30px; background-color: #f0f0f0; border-radius: 15px; overflow: hidden; margin-bottom: 10px; }
            .progress-fill { height: 100%; background-color: #4caf50; }
            .stats { display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <h1>Library Migration Progress Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
        
        ${data.map(migration => `
            <div class="chart">
                <h2>${migration.id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h2>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${migration.current * 100}%"></div>
                </div>
                <div class="stats">
                    <span>Current: ${(migration.current * 100).toFixed(1)}%</span>
                    <span>Target: ${(migration.target * 100).toFixed(1)}%</span>
                </div>
                <img src="${migration.id}-chart.png" alt="${migration.id} chart" width="800">
            </div>
        `).join('')}
    </body>
    </html>
    `;
    
    fs.writeFileSync('migration-report.html', html);
}

generateReport();
```

## Next Steps

- Set up automated report generation in your CI/CD pipeline
- Create team-specific dashboards
- Implement alerts for stalled migrations
- Add detailed file-level reporting for developers
