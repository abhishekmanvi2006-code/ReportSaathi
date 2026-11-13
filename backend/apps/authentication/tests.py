from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

class AuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'
        self.refresh_url = '/api/auth/token/refresh/'
        self.logout_url = '/api/auth/logout/'
        self.profile_url = '/api/auth/profile/'

        self.valid_user_data = {
            "username": "patient_arjun",
            "email": "arjun.synthetic@example.com",
            "password": "SecurePassword123!",
            "password_confirm": "SecurePassword123!",
            "preferred_language": "kn",
            "disclaimer_accepted": True
        }

    def test_successful_registration_and_cookie_set(self):
        response = self.client.post(self.register_url, self.valid_user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'patient_arjun')
        self.assertEqual(response.data['user']['profile']['preferred_language'], 'kn')
        self.assertTrue(response.data['user']['profile']['disclaimer_accepted'])

        # Verify HttpOnly refresh cookie is set
        self.assertIn('reportsaathi_refresh', response.cookies)
        cookie = response.cookies['reportsaathi_refresh']
        self.assertTrue(cookie['httponly'])
        self.assertEqual(cookie['samesite'], 'Lax')

    def test_registration_fails_without_disclaimer_acceptance(self):
        data = self.valid_user_data.copy()
        data['disclaimer_accepted'] = False
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('disclaimer_accepted', response.data)

    def test_duplicate_email_registration_rejected(self):
        self.client.post(self.register_url, self.valid_user_data, format='json')
        duplicate_data = self.valid_user_data.copy()
        duplicate_data['username'] = "different_user"
        response = self.client.post(self.register_url, duplicate_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_login_with_username_and_with_email(self):
        # Register user
        self.client.post(self.register_url, self.valid_user_data, format='json')

        # Test login via username
        login_resp = self.client.post(self.login_url, {
            "username": "patient_arjun",
            "password": "SecurePassword123!"
        }, format='json')
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_resp.data)

        # Test login via email
        email_login_resp = self.client.post(self.login_url, {
            "username": "arjun.synthetic@example.com",
            "password": "SecurePassword123!"
        }, format='json')
        self.assertEqual(email_login_resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', email_login_resp.data)

    def test_token_refresh_using_httponly_cookie(self):
        reg_resp = self.client.post(self.register_url, self.valid_user_data, format='json')
        refresh_cookie = reg_resp.cookies['reportsaathi_refresh'].value

        # Prepare refresh request carrying the cookie
        self.client.cookies['reportsaathi_refresh'] = refresh_cookie
        refresh_resp = self.client.post(self.refresh_url, {}, format='json')

        self.assertEqual(refresh_resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_resp.data)
        # Verify a new rotated refresh cookie was issued
        self.assertIn('reportsaathi_refresh', refresh_resp.cookies)

    def test_profile_retrieval_and_language_update(self):
        reg_resp = self.client.post(self.register_url, self.valid_user_data, format='json')
        access_token = reg_resp.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        profile_resp = self.client.get(self.profile_url)
        self.assertEqual(profile_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_resp.data['profile']['preferred_language'], 'kn')

        # Update language to Hindi
        patch_resp = self.client.patch(self.profile_url, {"preferred_language": "hi"}, format='json')
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data['profile']['preferred_language'], 'hi')

    def test_logout_clears_cookie(self):
        reg_resp = self.client.post(self.register_url, self.valid_user_data, format='json')
        refresh_cookie = reg_resp.cookies['reportsaathi_refresh'].value
        self.client.cookies['reportsaathi_refresh'] = refresh_cookie

        logout_resp = self.client.post(self.logout_url, {}, format='json')
        self.assertEqual(logout_resp.status_code, status.HTTP_200_OK)
        # Cookie is marked to be deleted
        self.assertEqual(logout_resp.cookies['reportsaathi_refresh'].value, '')
