# 📊 Project 1: Scikit-Learn Workflow (End-to-End Machine Learning)

This project demonstrates a complete **machine learning workflow using Scikit-learn**, from data preparation to model deployment. The goal is to build a classification model that predicts the likelihood of heart disease using patient medical data.

---

## 🎯 Objective

To apply an end-to-end machine learning pipeline that:

* Prepares and splits data
* Trains a model
* Evaluates performance
* Saves and reloads the model
* Makes predictions on new data

---

## 📁 Dataset

The dataset contains patient medical and demographic features such as:

* Age
* Sex
* Blood pressure
* Cholesterol levels
* Other clinical indicators

**Target Variable:**

* `target` → Indicates presence (1) or absence (0) of heart disease

---

## ⚙️ Workflow Steps

### 🔹 1. Data Preparation

* Features (`X`) created by dropping the target column
* Target (`y`) extracted from dataset

```python
X = heart_disease.drop("target", axis=1)
y = heart_disease["target"]
```

---

### 🔹 2. Train-Test Split

* Dataset split into training and testing sets

```python
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
```

---

### 🔹 3. Model Training

* Random Forest Classifier used for prediction

```python
from sklearn.ensemble import RandomForestClassifier

model = RandomForestClassifier(random_state=42)
model.fit(X_train, y_train)
```

---

### 🔹 4. Model Prediction

```python
y_preds = model.predict(X_test)
```

---

### 🔹 5. Model Evaluation

* Accuracy used to evaluate model performance

```python
from sklearn.metrics import accuracy_score

accuracy = accuracy_score(y_test, y_preds)
```

---

### 🔹 6. Model Saving

```python
import pickle

pickle.dump(model, open("random_forest_model_1.pkl", "wb"))
```

---

### 🔹 7. Model Loading & Inference

```python
loaded_model = pickle.load(open("random_forest_model_1.pkl", "rb"))

prediction = loaded_model.predict(X_test.loc[[206]])
```

---

## 🛠️ Technologies Used

* Python
* Pandas
* NumPy
* Scikit-learn
* Jupyter Notebook

---

## 📈 Key Learnings

* Importance of consistent data format between training and prediction
* Handling feature names when making predictions
* Building a reproducible ML pipeline
* Saving and reusing trained models

---

## 🚀 Future Improvements

* Add more evaluation metrics (Precision, Recall, F1-score)
* Hyperparameter tuning
* Deploy model using Streamlit or Flask
* Automate pipeline with Scikit-learn pipelines

---

## 📌 Conclusion

This project demonstrates a foundational **Scikit-learn workflow** and highlights best practices for building and deploying machine learning models in real-world scenarios.

---

⭐ *Feel free to explore, fork, and contribute!*
