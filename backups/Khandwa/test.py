from PIL import Image
import imagehash
import os
import shutil
from tqdm import tqdm

drive_folder = "/Users/hritik/Downloads/drive_photos"
hdd_folder = "/Volumes/H&R"
output_folder = "/Users/hritik/Downloads/matched_photos"

os.makedirs(output_folder, exist_ok=True)

# 🔹 Step 1: Build hash buckets
drive_buckets = {}

print("Processing Drive images...")
for file in tqdm(os.listdir(drive_folder)):
    path = os.path.join(drive_folder, file)
    try:
        img = Image.open(path)
        h = imagehash.phash(img)
        key = str(h)[:4]  # bucket key

        drive_buckets.setdefault(key, []).append((file, h))
    except:
        pass


# 🔹 Step 2: Walk HDD recursively
print("Scanning HDD...")

for root, dirs, files in os.walk(hdd_folder):
    for file in tqdm(files, leave=False):
        path = os.path.join(root, file)

        try:
            img = Image.open(path)
            hdd_hash = imagehash.phash(img)
            key = str(hdd_hash)[:4]

            # 🔥 Compare only with same bucket
            candidates = drive_buckets.get(key, [])

            for dfile, dhash in candidates:
                if abs(hdd_hash - dhash) < 5:
                    shutil.copy(path, os.path.join(output_folder, file))
                    break

        except:
            pass

print("Done!")