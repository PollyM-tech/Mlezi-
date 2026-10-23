"""Integration tests: isolated database and mocked cloud storage."""
import io
import unittest
from unittest.mock import patch
from app import create_app
from app.extensions import db
from app.models import CaregiverProfile

PNG = b'\x89PNG\r\n\x1a\n' + b'\x00' * 20

class CaregiverJourneyTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:', 'JWT_SECRET_KEY': 'isolated-test-secret-with-at-least-32-characters'})
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.client = self.app.test_client()
        self.photo = patch('app.routes.caregivers.upload_profile_photo', return_value={'url': 'https://example.test/photo.png', 'public_id': 'photo-new'}).start()
        self.national_id = patch('app.routes.caregivers.upload_national_id', return_value={'public_id': 'private-id'}).start()
        self.delete_photo = patch('app.routes.caregivers.delete_profile_photo').start()
        self.delete_id = patch('app.routes.caregivers.delete_national_id').start()
        self.headers = self.account('caregiver@example.test')

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()
        patch.stopall()

    def account(self, email, role='caregiver'):
        body = {'email': email, 'password': 'Testing123!', 'role': role, 'phone': '0712345678'}
        self.assertEqual(self.client.post('/api/auth/register', json=body).status_code, 201)
        result = self.client.post('/api/auth/login', json=body)
        self.assertEqual(result.status_code, 200)
        return {'Authorization': 'Bearer ' + result.json['access_token']}

    def fields(self, **overrides):
        values = {'name': 'Test Nanny', 'service_category': 'nanny', 'service_types': '["live_out", "part_time"]', 'location': 'Nairobi', 'bio': 'Experienced infant caregiver.', 'years_experience': '4', 'expected_pay_min': '15000', 'expected_pay_max': '25000', 'availability': '["Monday", "Friday"]', 'skills': '["Infant care"]', 'photo': (io.BytesIO(PNG), 'photo.png', 'image/png'), 'national_id': (io.BytesIO(PNG), 'id.png', 'image/png')}
        values.update(overrides)
        return values

    def create(self, **overrides):
        result = self.client.post('/api/caregivers/profile', headers=self.headers, data=self.fields(**overrides))
        result.request.input_stream.close()
        return result

    def test_complete_journey_and_privacy(self):
        self.assertEqual(self.client.get('/api/caregivers/profile', headers=self.headers).status_code, 404)
        created = self.create()
        self.assertEqual(created.status_code, 201)
        profile_id = created.json['profile']['id']
        self.assertTrue(created.json['profile']['national_id_uploaded'])
        self.assertEqual(self.client.get('/api/caregivers/profile', headers=self.headers).json['profile']['name'], 'Test Nanny')
        changed = self.client.put('/api/caregivers/profile', headers=self.headers, data={'name': 'Updated Nanny', 'phone': '+254712345678', 'availability': '["Tuesday"]'})
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(changed.json['profile']['availability'], ['Tuesday'])
        public = self.client.get(f'/api/caregivers/{profile_id}')
        for secret in ['phone', 'national_id_uploaded', 'id_document_public_id', 'photo_public_id', 'user_id', 'email']:
            self.assertNotIn(secret, public.json['profile'])
        self.assertNotIn('private-id', public.get_data(as_text=True))
        self.assertEqual(public.json['profile']['name'], 'Updated Nanny')
        self.assertEqual(self.create().status_code, 409)

    def test_ownership_and_roles(self):
        profile_id = self.create().json['profile']['id']
        other = self.account('other@example.test')
        employer = self.account('employer@example.test', 'employer')
        self.assertEqual(self.client.put(f'/api/caregivers/{profile_id}', headers=other, data={'name': 'Hijacked'}).status_code, 403)
        self.assertEqual(self.client.get('/api/caregivers/profile', headers=other).status_code, 404)
        for method in ['get', 'post', 'put']:
            self.assertEqual(getattr(self.client, method)('/api/caregivers/profile', headers=employer).status_code, 403)
            self.assertEqual(getattr(self.client, method)('/api/caregivers/profile').status_code, 401)

    def test_validation_before_upload(self):
        for invalid in [{'location': ''}, {'service_types': '["invented"]'}, {'years_experience': '-1'}, {'expected_pay_min': '30000'}, {'availability': '{"Monday": true}'}, {'skills': '"text"'}, {'service_category': 'other'}, {'photo': (io.BytesIO(b'fake'), 'fake.png', 'image/png')}]:
            with self.subTest(invalid=invalid):
                self.assertEqual(self.create(**invalid).status_code, 400)
        self.photo.assert_not_called()
        self.national_id.assert_not_called()

    def test_live_in_does_not_require_location(self):
        self.assertEqual(self.create(service_types='["live_in"]', location='').status_code, 201)

    def test_partial_update_validates_merged_fields(self):
        self.create()
        for fields in [{'expected_pay_min': '50000'}, {'location': ''}, {'verification_status': 'verified', 'name': ''}]:
            self.assertEqual(self.client.put('/api/caregivers/profile', headers=self.headers, data=fields).status_code, 400)
        changed = self.client.put('/api/caregivers/profile', headers=self.headers, data={'verification_status': 'verified', 'is_featured': 'true', 'user_id': '999'})
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(changed.json['profile']['verification_status'], 'unverified')
        self.assertFalse(CaregiverProfile.query.first().is_featured)

    def test_photo_replacement_preserves_id(self):
        self.create()
        profile = CaregiverProfile.query.first()
        profile.photo_public_id = 'old-photo'
        db.session.commit()
        result = self.client.put('/api/caregivers/profile', headers=self.headers, data={'photo': (io.BytesIO(PNG), 'new.png', 'image/png')})
        self.assertEqual(result.status_code, 200)
        self.delete_photo.assert_called_once_with('old-photo')
        self.assertEqual(profile.id_document_public_id, 'private-id')
        rejected = self.client.put('/api/caregivers/profile', headers=self.headers, data={'national_id': (io.BytesIO(PNG), 'id.png', 'image/png')})
        self.assertEqual(rejected.status_code, 400)

    def test_upload_failure_cleans_up(self):
        self.national_id.side_effect = RuntimeError('Cloud unavailable')
        self.assertEqual(self.create().status_code, 502)
        self.delete_photo.assert_called_once_with('photo-new')
        self.assertEqual(CaregiverProfile.query.count(), 0)

    def test_database_failure_cleans_up(self):
        with patch.object(db.session, 'commit', side_effect=RuntimeError('DB unavailable')):
            result = self.create()
        self.assertEqual(result.status_code, 500)
        self.delete_photo.assert_called_once_with('photo-new')
        self.delete_id.assert_called_once_with('private-id')
        self.assertEqual(CaregiverProfile.query.count(), 0)

    def test_missing_public_profile(self):
        self.assertEqual(self.client.get('/api/caregivers/999').status_code, 404)

    def test_specialty_categories_and_multiple_services_round_trip(self):
        created = self.create(service_category='newborn_maternity_nanny',
                              service_types='["overnight", "newborn_maternity_care", "breastfeeding_support"]')
        self.assertEqual(created.status_code, 201)
        profile_id = created.json['profile']['id']
        self.assertEqual(len(created.json['profile']['service_types']), 3)
        for category in ['travel_nanny', 'occasional_babysitter', 'breastfeeding_support',
                         'overnight_sleep_training', 'special_needs_nanny', 'newborn_maternity_nanny']:
            with self.subTest(category=category):
                changed = self.client.put('/api/caregivers/profile', headers=self.headers,
                                          data={'service_category': category})
                self.assertEqual(changed.status_code, 200)
                public = self.client.get(f'/api/caregivers/{profile_id}')
                self.assertEqual(public.json['profile']['service_category'], category)
                self.assertNotIn('phone', public.json['profile'])

    def test_oversized_upload_and_request(self):
        result = self.create(photo=(io.BytesIO(PNG + b'x' * (5 * 1024 * 1024)), 'large.png', 'image/png'))
        self.assertEqual(result.status_code, 400)
        result = self.create(photo=(io.BytesIO(PNG + b'x' * (13 * 1024 * 1024)), 'huge.png', 'image/png'))
        self.assertEqual(result.status_code, 413)
        self.assertIn('error', result.json)
        self.photo.assert_not_called()

    def test_auth_rejects_malformed_fields_and_admin_registration(self):
        for data in [['unexpected'], {'email': None}, {'password': 123}]:
            for endpoint in ['register', 'login']:
                self.assertEqual(self.client.post('/api/auth/' + endpoint, json=data).status_code, 400)
        self.assertEqual(self.client.post('/api/auth/register', json={
            'email': 'admin@example.test', 'password': 'Testing123!', 'role': 'admin',
        }).status_code, 400)

    def test_refresh_and_current_user(self):
        result = self.client.post('/api/auth/login', json={
            'email': 'caregiver@example.test', 'password': 'Testing123!',
        })
        refresh_headers = {'Authorization': 'Bearer ' + result.json['refresh_token']}
        refreshed = self.client.post('/api/auth/refresh', headers=refresh_headers)
        self.assertEqual(refreshed.status_code, 200)
        me = self.client.get('/api/auth/me', headers={'Authorization': 'Bearer ' + refreshed.json['access_token']})
        self.assertEqual(me.json['user']['role'], 'caregiver')
        self.assertEqual(self.client.get('/api/auth/me', headers=refresh_headers).status_code, 401)

if __name__ == '__main__':
    unittest.main()
