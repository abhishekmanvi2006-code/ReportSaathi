from django.core.files.storage import FileSystemStorage
from django.conf import settings

class PrivateFileSystemStorage(FileSystemStorage):
    """
    Custom storage system ensuring medical files are stored strictly inside
    the non-public MEDIA_PRIVATE_ROOT directory.
    base_url is explicitly None so files cannot be accessed via direct URLs.
    """
    def __init__(self, *args, **kwargs):
        kwargs['location'] = str(settings.MEDIA_PRIVATE_ROOT)
        kwargs['base_url'] = None
        super().__init__(*args, **kwargs)

    def url(self, name):
        raise NotImplementedError(
            "Direct public URLs are prohibited for private medical documents. "
            "Access files strictly via the authenticated download API."
        )

private_storage = PrivateFileSystemStorage()
