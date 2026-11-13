from django.urls import path
from .views import (
    DocumentListCreateView,
    DocumentDetailView,
    DocumentDownloadStreamView,
    DocumentPreviewView,
    DocumentExtractView,
    DocumentExtractionDetailView,
    DocumentVerifyItemView,
    DocumentExplainView,
    DocumentExplanationDetailView,
)

urlpatterns = [
    path('', DocumentListCreateView.as_view(), name='document_list_create'),
    path('<uuid:pk>/', DocumentDetailView.as_view(), name='document_detail'),
    path('<uuid:pk>/download/', DocumentDownloadStreamView.as_view(), name='document_download'),
    path('<uuid:pk>/preview/', DocumentPreviewView.as_view(), name='document_preview'),
    path('<uuid:pk>/extract/', DocumentExtractView.as_view(), name='document_extract'),
    path('<uuid:pk>/extraction/', DocumentExtractionDetailView.as_view(), name='document_extraction'),
    path('<uuid:pk>/verify/', DocumentVerifyItemView.as_view(), name='document_verify'),
    path('<uuid:pk>/explain/', DocumentExplainView.as_view(), name='document_explain'),
    path('<uuid:pk>/explanation/', DocumentExplanationDetailView.as_view(), name='document_explanation_detail'),
]
