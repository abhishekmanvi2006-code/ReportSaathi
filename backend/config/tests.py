from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

class HealthCheckEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_check_returns_200(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('status'), 'healthy')
        self.assertEqual(response.data.get('database'), 'sqlite')
        self.assertIn('en', response.data.get('supported_languages'))
        self.assertIn('kn', response.data.get('supported_languages'))
        self.assertIn('hi', response.data.get('supported_languages'))
        self.assertIn('medical_disclaimer', response.data)
