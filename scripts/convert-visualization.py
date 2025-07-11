# This script demonstrates how your Python visualization code might look
# You can use this to understand how to convert it to JavaScript

import matplotlib.pyplot as plt
import numpy as np
import json
import base64
from io import BytesIO

# Example function that might be similar to your Google Colab code
def visualize_data(data):
    # Create a figure
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Example: If data is a list of values, create a bar chart
    if isinstance(data, list) and all(isinstance(x, (int, float)) for x in data):
        ax.bar(range(len(data)), data)
        ax.set_xlabel('Index')
        ax.set_ylabel('Value')
        ax.set_title('Data Visualization')
    
    # Example: If data has 'x' and 'y' keys, create a scatter plot
    elif isinstance(data, dict) and 'x' in data and 'y' in data:
        ax.scatter(data['x'], data['y'])
        ax.set_xlabel('X')
        ax.set_ylabel('Y')
        ax.set_title('Scatter Plot')
    
    # Add more visualization types based on your specific needs
    
    # Save to a base64 string that can be used in HTML
    buffer = BytesIO()
    plt.savefig(buffer, format='png')
    buffer.seek(0)
    image_png = buffer.getvalue()
    buffer.close()
    
    # Convert to base64 string
    graphic = base64.b64encode(image_png).decode('utf-8')
    
    return f'data:image/png;base64,{graphic}'

# Example usage
sample_data = [5, 10, 15, 20, 25]
result = visualize_data(sample_data)
print("Base64 image data:", result[:50] + "...")  # Print first 50 chars of the result
