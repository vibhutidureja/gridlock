import pandas as pd

# Load the raw data
df = pd.read_csv("Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv", low_memory=False)

# 1. Total Rows and Columns
print(f"Total Rows: {df.shape[0]}")
print(f"Total Columns: {df.shape[1]}\n")

# 2. Exact Null Values per column
print("--- MISSING VALUES ---")
missing = df.isnull().sum()
print(missing[missing > 0].sort_values(ascending=False))
# ---
time_cols = ['start_datetime', 'resolved_datetime', 'end_datetime', 'closed_datetime']
for col in time_cols:
    df[col] = pd.to_datetime(df[col], errors='coerce')

df = df.dropna(subset=['start_datetime'])
best_end = df['resolved_datetime'].combine_first(df['end_datetime']).combine_first(df['closed_datetime'])
df['target_mins'] = (best_end - df['start_datetime']).dt.total_seconds() / 60



# 3. DROP COLUMNS (>4000 missing + useless IDs/text)
cols_to_drop = [
    # The > 4000 missing columns
    'meta_data', 'map_file', 'comment', 'direction', 
    'resolved_at_longitude', 'resolved_at_latitude', 'resolved_at_address', 
    'resolved_by_id', 'resolved_datetime', 'citizen_accident_id', 
    'assigned_to_police_id', 'route_path', 'age_of_truck', 
    'reason_breakdown', 'cargo_material', 'end_datetime', 
    'end_address', 'junction', 'closed_by_id', 'closed_datetime', 
    'gba_identifier', 'zone',
    # IDs and free-text that ML cannot use properly
    'id', 'origin_incident_number', 'veh_no', 'description', 
    'kgid', 'created_by_id', 'last_modified_by_id', 'start_datetime'
]

df = df.drop(columns=[c for c in cols_to_drop if c in df.columns], errors='ignore')

# 4. FILL REMAINING NULLS
# A. Categoricals (Fill with Mode)
cat_cols = ['veh_type', 'corridor', 'priority', 'event_type', 'event_cause']
for col in cat_cols:
    if col in df.columns:
        mode_val = df[col].mode()[0]
        df[col] = df[col].fillna(mode_val)

# B. Numerical & Coordinates (Fill with Median)
num_cols = ['latitude', 'longitude', 'endlatitude', 'endlongitude']
for col in num_cols:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        median_val = df[col].median()
        df[col] = df[col].fillna(median_val)

print(f"\nFinal Cleaned Dataset Shape: {df.shape}")
print("Remaining Missing Values in Dataset:")
print(df.isnull().sum().sum()) # Should be
# ---
df
# ---
df.isnull().sum()
df["target_mins"]
# ---
df.info()
# ---

# ---
numeric_df = df.select_dtypes(include=['float64', 'int32', 'int64'])

# 2. Calculate the correlation matrix
corr_matrix = numeric_df.corr()

# 3. Set up the visual canvas
plt.figure(figsize=(12, 10))
plt.title("Feature Correlation Heatmap", fontsize=16, pad=20)

# 4. Create a mask to hide the top right triangle (it's a mirror image of the bottom left)
mask = np.triu(np.ones_like(corr_matrix, dtype=bool))

# 5. Plot the heatmap
sns.heatmap(
    corr_matrix, 
    mask=mask,
    annot=True,          # Show the actual correlation numbers
    fmt=".2f",           # Round to 2 decimal places
    cmap="coolwarm",     # Blue for negative correlation, Red for positive
    vmin=-1, vmax=1,     # Set the scale from -1 to 1
    linewidths=0.5,
    cbar_kws={"shrink": .8}
)

plt.tight_layout()
plt.show()

# Print the specific correlations targeting our goal (target_mins)
print("\n--- Correlation with Target Variable (target_mins) ---")
print(corr_matrix['target_mins'].sort_values(ascending=False))
# ---
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
# ---
# Select only the text/categorical columns
cat_cols = df.select_dtypes(include=['object']).columns

# Loop through each column and print the unique value counts
for col in cat_cols:
    print(f"\n{'='*30}")
    print(f"COLUMN: {col.upper()}")
    print(f"{'='*30}")
    print(df[col].value_counts())
    print(f"Total Unique Categories: {df[col].nunique()}\n")
# ---
import pandas as pd
import numpy as np

# 1. PARSE THE ADDRESS
# Split the address by commas into a list
address_parts = df['address'].astype(str).str.split(',')

# Safely extract the 2nd item (index 1) for add1, and 3rd item (index 2) for add2
df['add1'] = address_parts.apply(lambda x: x[1].strip() if isinstance(x, list) and len(x) > 1 else "Unknown")
df['add2'] = address_parts.apply(lambda x: x[2].strip() if isinstance(x, list) and len(x) > 2 else "Unknown")

# Use Regex to extract the 6 digits immediately following "Pin-"
df['pin'] = df['address'].astype(str).str.extract(r'Pin-(\d{6})')
df['pin'] = df['pin'].fillna("Unknown")


# 2. PARSE CREATED & MODIFIED DATETIMES
time_columns = {
    'created_date': 'c', 
    'modified_datetime': 'm'
}

for col, prefix in time_columns.items():
    if col in df.columns:
        # Convert to proper datetime objects
        dt_series = pd.to_datetime(df[col], errors='coerce')
        
        # Extract individual components
        df[f'{prefix}month'] = dt_series.dt.month.fillna(0).astype(int)
        df[f'{prefix}date'] = dt_series.dt.day.fillna(0).astype(int)
        df[f'{prefix}hour'] = dt_series.dt.hour.fillna(0).astype(int)
        df[f'{prefix}time'] = dt_series.dt.strftime('%H:%M').fillna("Unknown")


# 3. DROP THE ORIGINAL COLUMNS
cols_to_drop = ['address', 'created_date', 'modified_datetime']
df = df.drop(columns=[c for c in cols_to_drop if c in df.columns], errors='ignore')

# Check the new columns
print(df[['add1', 'add2', 'pin', 'cmonth', 'cdate', 'chour', 'ctime']].head())
# ---
df.columns
# ---
df.info()
# ---
df
# ---
df_clean = df.copy()
# ---
df_clean
# ---
df_clean.info()
# ---
# The "Better" (and mathematically required) Way:
temp_created = pd.to_datetime("2024-" + df_clean['cmonth'].astype(str) + "-" + df_clean['cdate'].astype(str) + " " + df_clean['ctime'])
temp_modified = pd.to_datetime("2024-" + df_clean['mmonth'].astype(str) + "-" + df_clean['mdate'].astype(str) + " " + df_clean['mtime'])

df_clean['min_to_take_action'] = (temp_modified - temp_created).dt.total_seconds() / 60
# ---
df_clean

# ---
# 1. The Reality Filter: Drop time-travel, bots, and forgotten tickets
df_clean = df_clean[
    (df_clean['min_to_take_action'] > 1) & 
    (df_clean['min_to_take_action'] <= 1440)
]

# 2. Drop any rows where the math completely failed (NaNs)
df_clean = df_clean.dropna(subset=['min_to_take_action'])

# 3. Let's see the new, clean distribution!
print(f"Clean rows remaining for ML: {len(df_clean)}")
print("\n--- Final Response Time Distribution (Minutes) ---")
print(df_clean['min_to_take_action'].describe())
# ---
df_clean
# ---
df_clean.info()
# ---
# Drop the old broken target column
df_clean = df_clean.drop(columns=['target_mins'], errors='ignore')

# Verify it is officially gone
print("Target dropped! Remaining columns:")
print(df_clean.columns.tolist())
# ---
df_pure=df_clean.copy()
# ---
df_pure
# ---
df.head()
# ---
print(df_pure.iloc[0])
# ---
cat_cols = df_pure.select_dtypes(include=['float64', 'int32', 'int64']).columns

# Loop through each column and print the unique value counts
for col in cat_cols:
    print(f"\n{'='*30}")
    print(f"COLUMN: {col.upper()}")
    print(f"{'='*30}")
    print(df_pure[col].value_counts())
    print(f"Total Unique Categories: {df_pure[col].nunique()}\n")
# ---
# 1. The Final Hit List
stubborn_ghosts = ['endlatitude', 'endlongitude', 'client_id']

# 2. Hard Drop
df_pure = df_pure.drop(columns=[c for c in stubborn_ghosts if c in df_pure.columns], errors='ignore')

# 3. Verify the drop was successful
print("🚨 Final columns remaining:")
print(df_pure.columns.tolist())
# ---
df_pure
# ---
df_pure.info()
# ---
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# --- 1. NUMERICAL CORRELATION HEATMAP ---
plt.figure(figsize=(10, 8))

# Select only numeric columns (Coordinates, Time components, Target)
numeric_df = df_pure.select_dtypes(include=['float64', 'int64', 'int32', 'bool'])
corr_matrix = numeric_df.corr()

# Generate the heatmap
mask = np.triu(np.ones_like(corr_matrix, dtype=bool))
sns.heatmap(
    corr_matrix, 
    mask=mask, annot=True, fmt=".2f", cmap="coolwarm", 
    vmin=-1, vmax=1, cbar_kws={"shrink": .8}
)
plt.title("Correlation Heatmap", fontsize=16, pad=20)
plt.tight_layout()
plt.show()

# --- 2. CATEGORICAL BOX PLOTS ---
# Let's look at how these 4 specific categories impact the response time
categories_to_check = ['priority', 'requires_road_closure', 'event_type', 'event_cause']

fig, axes = plt.subplots(2, 2, figsize=(16, 12))
axes = axes.flatten()

for i, cat in enumerate(categories_to_check):
    if cat in df_pure.columns:
        # We use showfliers=False to hide extreme outliers so the box itself is visible
        sns.boxplot(data=df_pure, x=cat, y='min_to_take_action', ax=axes[i], showfliers=False, palette='Set2')
        axes[i].set_title(f"Impact of {cat.upper()} on Response Time", fontsize=14)
        axes[i].set_ylabel("Minutes to Take Action")
        axes[i].tick_params(axis='x', rotation=45)

plt.tight_layout()
plt.show()
# ---
import matplotlib.pyplot as plt
import seaborn as sns

# ==========================================
# 1. NUMERICAL HISTOGRAMS (Time & Target)
# ==========================================
# We focus on the most important numerical columns
num_cols = ['min_to_take_action', 'chour', 'mhour', 'cmonth']

fig, axes = plt.subplots(2, 2, figsize=(14, 10))
axes = axes.flatten()

for i, col in enumerate(num_cols):
    if col in df_pure.columns:
        # The target variable often needs more bins to see the fine details
        if col == 'min_to_take_action':
            sns.histplot(data=df_pure, x=col, bins=60, ax=axes[i], color='teal', kde=True)
            axes[i].set_title(f"Distribution of {col} (Target)", fontsize=12)
            # Optional: If the tail is extremely long, uncomment the next line to zoom in on the bulk of the data
            # axes[i].set_xlim(0, 300) 
        else:
            # For hours (24 bins) and months (12 bins), we use discrete bins
            bins = 24 if 'hour' in col else 12
            sns.histplot(data=df_pure, x=col, bins=bins, ax=axes[i], color='steelblue', discrete=True)
            axes[i].set_title(f"Distribution of {col}", fontsize=12)
        
        axes[i].set_ylabel("Number of Incidents")

plt.tight_layout()
plt.show()

# ==========================================
# 2. CATEGORICAL "HISTOGRAMS" (Count Plots)
# ==========================================
# Let's check the volume of our other target and key features
cat_cols = ['priority', 'requires_road_closure', 'event_type', 'veh_type']

fig, axes = plt.subplots(2, 2, figsize=(14, 10))
axes = axes.flatten()

for i, col in enumerate(cat_cols):
    if col in df_pure.columns:
        # Order by highest frequency first
        order = df_pure[col].value_counts().index
        sns.countplot(data=df_pure, x=col, ax=axes[i], palette='viridis', order=order)
        axes[i].set_title(f"Frequency of {col}", fontsize=12)
        axes[i].set_ylabel("Count")
        axes[i].tick_params(axis='x', rotation=45)

plt.tight_layout()
plt.show()
# ---
df_pure.info()
# ---
# The final 7 columns that must go
columns_to_drop = [
    'status', 'authenticated', 'ctime', 'mtime', 
    'mmonth', 'mdate', 'mhour'
]

# Create the final machine learning dataset
df_ml = df_pure.drop(columns=[c for c in columns_to_drop if c in df_pure.columns], errors='ignore')

# Verify we have exactly 16 columns left (14 features + 2 targets)
print(f"Final columns remaining: {len(df_ml.columns)}")
# ---
df_ml
# ---
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.preprocessing import OrdinalEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

# ==========================================
# 1. THE NEW TARGET: SLA BREACH (OVER 60 MINS)
# ==========================================
# If it takes more than 60 mins, it's a 1 (Delayed). Otherwise, 0 (On Time).
df_ml['is_delayed'] = (df_ml['min_to_take_action'] > 60).astype(int)

# Drop the old targets completely
X = df_ml.drop(columns=['min_to_take_action', 'requires_road_closure', 'is_delayed'])
y = df_ml['is_delayed']

# ==========================================
# 2. THE FRESH ARCHITECTURE PIPELINE
# ==========================================
# Define categorical columns
cat_cols = [
    'event_type', 'event_cause', 'veh_type', 'corridor', 
    'priority', 'police_station', 'add1', 'add2', 'pin'
]

# Ensure they are strings
for col in cat_cols:
    X[col] = X[col].fillna("Unknown").astype(str)

# We use an OrdinalEncoder to translate text into numbers for the new model
categorical_transformer = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)

preprocessor = ColumnTransformer(
    transformers=[('cat', categorical_transformer, cat_cols)],
    remainder='passthrough' # Leave numbers (like chour, cmonth) alone
)

# Initialize the new Gradient Boosting Engine
model = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('classifier', HistGradientBoostingClassifier(
        max_iter=500, 
        learning_rate=0.05, 
        max_depth=5, 
        class_weight='balanced', # Automatically handles the ratio of fast vs slow tickets
        random_state=42
    ))
])

# ==========================================
# 3. TRAIN AND EVALUATE
# ==========================================
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("🚀 Training SLA Breach Predictor...\n")
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

print("="*50)
print("🏆 NEW MODEL: DELAY RISK PERFORMANCE")
print("="*50)
print(f"Overall Accuracy: {accuracy_score(y_test, y_pred) * 100:.2f}%\n")
print("Classification Report:")
print(classification_report(y_test, y_pred, target_names=['On Time (<60m)', 'Delayed (>60m)']))
# ---

# ---
