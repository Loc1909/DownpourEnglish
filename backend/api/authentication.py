import firebase_admin
from firebase_admin import credentials, auth
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from django.conf import settings
import os
from cloudinary import uploader as cloudinary_uploader

User = get_user_model()

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    cred_path = settings.FIREBASE_CREDENTIALS_PATH
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        raise Exception("Firebase credentials file not found")


class FirebaseAuthentication(BaseAuthentication):

    def authenticate(self, request):
        # Get Firebase token from header
        firebase_token = request.META.get('HTTP_FIREBASE_TOKEN')

        if not firebase_token:
            return None


        if firebase_token.startswith('Bearer '):
            firebase_token = firebase_token[7:]

        try:
            # Verify Firebase token
            decoded_token = auth.verify_id_token(firebase_token)
            firebase_uid = decoded_token['uid']

            # Get or create user
            try:
                user = User.objects.get(username=firebase_uid)
                # Update avatar from Firebase picture if missing
                picture_url = decoded_token.get('picture')
                if picture_url and not getattr(user, 'avatar', None):
                    try:
                        upload_result = cloudinary_uploader.upload(picture_url, folder='avatars')
                        user.avatar = upload_result.get('public_id')
                        user.save(update_fields=['avatar'])
                    except Exception:
                        pass
            except User.DoesNotExist:
                # Create new user from Firebase data
                user_data = {
                    'username': firebase_uid,
                    'email': decoded_token.get('email', ''),
                    'display_name': decoded_token.get('name', ''),
                    'is_active': True,
                }

                # Set first and last name if available
                if 'name' in decoded_token:
                    name_parts = decoded_token['name'].split(' ', 1)
                    user_data['first_name'] = name_parts[0]
                    if len(name_parts) > 1:
                        user_data['last_name'] = name_parts[1]

                user = User.objects.create_user(**user_data)

                # Set avatar from Firebase picture if available
                picture_url = decoded_token.get('picture')
                if picture_url:
                    try:
                        upload_result = cloudinary_uploader.upload(picture_url, folder='avatars')
                        user.avatar = upload_result.get('public_id')
                        user.save(update_fields=['avatar'])
                    except Exception:
                        pass

            return (user, firebase_token)

        except auth.InvalidIdTokenError:
            raise AuthenticationFailed('Invalid Firebase token')
        except auth.ExpiredIdTokenError:
            raise AuthenticationFailed('Firebase token has expired')
        except Exception as e:
            raise AuthenticationFailed(f'Firebase authentication failed: {str(e)}')

    def authenticate_header(self, request):
        return 'Firebase'


def get_firebase_user_info(firebase_token):

    try:
        decoded_token = auth.verify_id_token(firebase_token)
        return {
            'uid': decoded_token['uid'],
            'email': decoded_token.get('email'),
            'name': decoded_token.get('name'),
            'picture': decoded_token.get('picture'),
            'email_verified': decoded_token.get('email_verified', False)
        }
    except Exception as e:
        return None


def create_custom_token(uid):

    try:
        custom_token = auth.create_custom_token(uid)
        return custom_token.decode('utf-8')
    except Exception as e:
        return None