from tkinter.constants import UNDERLINE
from pystac_client import Client
import requests
import json

# STAC API root URL
URL = 'https://catalog.dive.edito.eu'

# custom headers
headers = []

# Open the STAC catalog root
cat = Client.open(URL, headers=headers)
print(cat)


query = 'catalogs?q=Wind%20farm&limit=500'
url = f'https://api.dive.edito.eu/data/{query}'

response = requests.get(url)
print(response.json())
responsejson = response.json()

# from the responsejson, get the links if the type is resto:collection
collection_links = [link for link in responsejson['links']
                    if 'resto:type' in link and link['resto:type'] == 'collection']


wind_farm_items = []

for collection_link in collection_links:
    url = collection_link['href']
    response = requests.get(url)

    if response.status_code != 200:
        print(f'Error with {url}')
        continue
    itemslink = [link for link in response.json()['links']
                 if link['rel'] == 'items']

    if not itemslink:
        print(f'No items link found for {url}')
        continue
    itemsurl = itemslink[0]['href']
    response = requests.get(itemsurl)
    if response.status_code != 200:
        print(f'Error with {itemsurl}, {response.status_code}')
        continue
    responsejson = response.json()
    wind_farm_items.extend(responsejson['features'])
    print(f'Found {len(wind_farm_items)} items for {url}')

with open('wind_farm_items.json', 'w') as f:
    json.dump(wind_farm_items, f, indent=4)
