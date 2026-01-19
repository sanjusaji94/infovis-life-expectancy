# Global Life Expectancy Across Countries (2000–2015)

🔗 **Live Demo:**  
https://sanjusaji94.github.io/infovis-life-expectancy/

## Overview
This project is an interactive web-based visualization that explores **global life expectancy across countries from 2000 to 2015**.  
The dashboard enables users to analyze temporal trends, compare countries, and examine the relationship between life expectancy and economic indicators.

The project was developed as part of **Group Assignment 2 (Interactive Visualization Project)** for the *Information Visualization* course.

---

## Research Questions
- How has life expectancy changed over time for different countries?
- How does life expectancy vary across countries in a given year?
- What is the relationship between GDP per capita and life expectancy?
- How is life expectancy distributed across countries in a selected year?

---

## Visualizations
The dashboard consists of four coordinated views:

1. **Line Chart**  
   Life expectancy trend over time for a selected country.

2. **Bar Chart**  
   Top 10 countries by life expectancy for the selected year.

3. **Scatter Plot**  
   GDP per capita vs. life expectancy across all countries in the selected year.

4. **Histogram**  
   Distribution of life expectancy values across countries for the selected year.

---

## Interactions
- **Year slider** to explore data across time
- **Country dropdown** to select a specific country
- **Click interaction** on bar and scatter plots to select a country
- **Coordinated views**: selections are reflected across all charts
- **Tooltips** for detailed values on hover

---

## Data
- **Dataset:** Global Life Expectancy dataset  
- **Attributes used:** Country, Year, Life Expectancy, GDP per Capita, Population

---

## Technologies Used
- **D3.js (v7)** for interactive visualizations
- **HTML / CSS / JavaScript**
- **GitHub Pages** for deployment

---

## Project Structure

```text
.
├── index.html
├── style.css
├── script.js
└── data
    └── Life_Expectancy_Data.csv
```
---

## Deployment
The visualization is deployed using **GitHub Pages** and runs directly in a standard web browser without additional installation.

---

## Author
**Sanju Saji**  
Information Visualization – TU Wien
