import urllib.request as r
import json
try:
    req = r.Request(
        'http://localhost:8000/auth/signin', 
        data=json.dumps({'email': 'test@test.com', 'password': 'password'}).encode(), 
        headers={'content-type':'application/json'}
    )
    print(r.urlopen(req).read().decode())
except Exception as e:
    print(str(e))
    if hasattr(e, 'read'):
        print(e.read().decode())
