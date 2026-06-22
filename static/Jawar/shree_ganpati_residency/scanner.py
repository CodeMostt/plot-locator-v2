import cv2
import numpy as np
import pyperclip
import os

# --- Configuration ---
image_path = 'map.png'        # Make sure this matches your image name
output_csv = 'my_new_plots.csv' # The file where data will be saved automatically
starting_plot_id = "L-2"  # Change this if you want to start at a different number!

# 1. Create the CSV file and write the header (if it doesn't exist)
if not os.path.exists(output_csv):
    with open(output_csv, 'w') as f:
        f.write("plot_id,size,status,owner,customer_number,booking_date,registry_date,coords,color\n")

# 2. Load the image
img = cv2.imread(image_path)
if img is None:
    print(f"Error: Could not load {image_path}. Make sure it's in the same folder.")
    exit()

# 3. Pre-processing for AI detection
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
blur = cv2.GaussianBlur(gray, (5,5), 0)
thresh = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)

contours, _ = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

valid_plots = []
for cnt in contours:
    area = cv2.contourArea(cnt)
    if 400 < area < 25000: 
        rect = cv2.minAreaRect(cnt)
        box = cv2.boxPoints(rect)
        box = np.int32(box)
        valid_plots.append(box)

# Draw green outlines
cv2.drawContours(img, valid_plots, -1, (0, 255, 0), 1)

# Keep track of the current ID
current_plot_id = starting_plot_id

def mouse_click(event, x, y, flags, param):
    global current_plot_id
    if event == cv2.EVENT_LBUTTONDOWN:
        for box in valid_plots:
            # Check if clicked inside this box
            if cv2.pointPolygonTest(box, (x, y), False) >= 0:
                
                # Format coordinates
                coords = f"{box[0][0]},{box[0][1]},{box[1][0]},{box[1][1]},{box[2][0]},{box[2][1]},{box[3][0]},{box[3][1]}"
                
                # Format full CSV row EXACTLY as you requested
                csv_row = f'{current_plot_id},,Vacant,,,,,"{coords}",'
                
                # Highlight in RED
                cv2.drawContours(img, [box], -1, (0, 0, 255), 3)
                
                # Add the Plot ID text to the center of the box on the screen
                M = cv2.moments(box)
                if M["m00"] != 0:
                    cX = int(M["m10"] / M["m00"])
                    cY = int(M["m01"] / M["m00"])
                    cv2.putText(img, str(current_plot_id), (cX-15, cY+5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                
                cv2.imshow("Techunited CSV Generator", img)
                
                # --- AUTO-SAVE TO CSV ---
                with open(output_csv, 'a') as f:
                    f.write(csv_row + "\n")
                
                # Also copy to clipboard just in case
                pyperclip.copy(csv_row)
                print(f"✅ Saved Plot {current_plot_id} -> {csv_row}")
                
                # Increment the ID for the next click
                current_plot_id += 1
                break

cv2.namedWindow("Techunited CSV Generator", cv2.WINDOW_NORMAL)
cv2.setMouseCallback("Techunited CSV Generator", mouse_click)

print("\n" + "="*50)
print(" 🚀 CSV AUTO-GENERATOR READY")
print("="*50)
print(f"Data will be automatically saved to: {output_csv}")
print("1. Click on a green plot.")
print("2. The script writes the full row to the CSV file.")
print("3. It marks the map with the ID and prepares the next number.")
print("Press 'ESC' to close.\n")

while True:
    cv2.imshow("Techunited CSV Generator", img)
    if cv2.waitKey(1) & 0xFF == 27: # ESC key
        break

cv2.destroyAllWindows()