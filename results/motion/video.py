import cv2
import glob
import re

def numerical_sort(filename):
    # This function extracts the numerical part of the filename and returns it for sorting
    numbers = re.compile(r'(\d+)')
    parts = numbers.split(filename)
    parts[1::2] = map(int, parts[1::2])  # Convert the extracted numbers to integers
    return parts

img_array = []
filenames = sorted(glob.glob('*.png'), key=numerical_sort)  # Sort filenames numerically
for filename in filenames:
    img = cv2.imread(filename)
    if img is not None:
        if 'size' not in locals():  # Check if size is already defined
            height, width, layers = img.shape
            size = (width, height)
        img_array.append(img)
    else:
        print(f"Error loading image {filename}")

if img_array:
    out = cv2.VideoWriter('output.avi', cv2.VideoWriter_fourcc(*'DIVX'), 30, size)

    for img in img_array:
        out.write(img)

    out.release()
else:
    print("No images found or loaded")
