"""Đánh giá mô hình phân loại phải độc lập với tập huấn luyện (M14)."""

import train_model


def test_cross_validated_accuracy_is_independent_and_bounded():
    result = train_model.cross_validated_accuracy()
    assert 0.0 <= result["accuracy"] <= 1.0
    assert result["folds"] >= 2
    assert set(result["per_class"]) == {item[1] for item in train_model.TRAINING_DATA}


def test_cv_accuracy_is_not_the_training_accuracy():
    pipeline = train_model.build_pipeline()
    texts = [i[0] for i in train_model.TRAINING_DATA]
    labels = [i[1] for i in train_model.TRAINING_DATA]
    pipeline.fit(texts, labels)
    train_acc = (pipeline.predict(texts) == labels).mean() if hasattr(pipeline.predict(texts), "mean") else None
    cv = train_model.cross_validated_accuracy()["accuracy"]
    # Đo trên chính tập huấn luyện luôn cao hơn hoặc bằng đo độc lập
    assert train_acc is not None and train_acc >= cv
