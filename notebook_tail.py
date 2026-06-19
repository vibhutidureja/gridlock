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

---CELL---



---CELL---


# ===== Feature Engineering Improvements =====
from sklearn.cluster import KMeans

# Temporal features
# Reconstruct a temporary datetime series from cmonth, cdate, chour to get day_of_week
# Assuming all events are in 2024 for day of week calculation as per previous steps.
df_ml_temp_created_dt = pd.to_datetime(
    '2024-' + df_ml['cmonth'].astype(str) + '-' + df_ml['cdate'].astype(str) +
    ' ' + df_ml['chour'].astype(str) + ':00:00', errors='coerce'
)
df_ml["day_of_week"] = df_ml_temp_created_dt.dt.dayofweek
df_ml["is_weekend"] = (df_ml["day_of_week"] >= 5).astype(int)

df_ml["rush_hour"] = (
    ((df_ml["chour"] >= 8) & (df_ml["chour"] <= 11)) |
    ((df_ml["chour"] >= 17) & (df_ml["chour"] <= 20))
).astype(int)

# Location clustering
kmeans = KMeans(n_clusters=20, random_state=42, n_init=10)
df_ml["location_cluster"] = kmeans.fit_predict(
    df_ml[["latitude", "longitude"]]
)

print("New features created successfully")


---CELL---


# ===== Model Evaluation =====
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix
)

preds = model.predict(X_test)

if hasattr(model, "predict_proba"):
    probs = model.predict_proba(X_test)[:, 1]
    print("ROC-AUC:", roc_auc_score(y_test, probs))

print("Accuracy :", accuracy_score(y_test, preds))
print("Precision:", precision_score(y_test, preds))
print("Recall   :", recall_score(y_test, preds))
print("F1 Score :", f1_score(y_test, preds))
print("Confusion Matrix")
print(confusion_matrix(y_test, preds))


---CELL---


# ===== CatBoost Version (Try for higher AUC) =====
!pip install -q catboost

from catboost import CatBoostClassifier
from sklearn.metrics import roc_auc_score, accuracy_score, precision_score, recall_score, f1_score

cat_model = CatBoostClassifier(
    iterations=1500,
    depth=8,
    learning_rate=0.03,
    eval_metric='AUC',
    auto_class_weights='Balanced',
    verbose=100,
    random_state=42
)

cat_model.fit(X_train, y_train)

preds = cat_model.predict(X_test)
probs = cat_model.predict_proba(X_test)[:,1]

print("=== CATBOOST RESULTS ===")
print("ROC-AUC  :", roc_auc_score(y_test, probs))
print("Accuracy :", accuracy_score(y_test, preds))
print("Precision:", precision_score(y_test, preds))
print("Recall   :", recall_score(y_test, preds))
print("F1 Score :", f1_score(y_test, preds))
