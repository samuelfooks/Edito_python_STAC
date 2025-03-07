import copernicusmarine
import copernicusmarine.command_line_interface
import xarray
from copernicusmarine.core_functions import custom_open_zarr
import pandas as pd
import json
# Open a dataset

import subprocess
import os

if os.path.exists("catalog.json"):
    with open("catalog.json", "r") as f:
        catalog = json.load(f)
else:
    # Command to describe datasets and save to 'datasets.json'
    with open("datasets.json", "w") as f:
        subprocess.run(["copernicusmarine", "describe", "--return-fields=datasets"], stdout=f)

if os.path.exists("catalog.json"):
    with open("catalog.json", "r") as f:
        catalog = json.load(f)
else:
    # Command to describe datasets and save to 'datasets.json'
    with open("datasets.json", "w") as f:
        subprocess.run(["copernicusmarine", "describe", "--return-fields=datasets"], stdout=f)

# if datasets.json exists, read it
with open("datasets.json", "r") as f:
    products = json.load(f)


# Iterate through products and datasets
for datasetitem in products['products']:
    for dataset in datasetitem['datasets']:
        # Extract dataset information
        dataset_name = dataset['dataset_name']
        print(f"Dataset Name: {dataset_name}")

        # Iterate through versions
        for version in dataset['versions']:
            version_label = version['label']
            print(f"Version Label: {version_label}")

            # Iterate through parts
            for part in version.get('parts', []):
                part_name = part['name']
                print(f"  Part Name: {part_name}")

                # Iterate through services
                for service in part.get('services', []):

                    if 'service_format' in service and 'zarr' in service['service_format']:
                        service_name = service['service_name']
                        service_short_name = service['service_short_name']
                        service_uri = service['uri']
                        print(f"    Service Name: {service_name}")
                        print(f"    Service Short Name: {service_short_name}")
                        print(f"    Service URI: {service_uri}")

                        # Iterate through variables
                        for variable in service.get('variables', []):
                            short_name = variable['short_name']
                            units = variable['units']
                            bbox = variable['bbox']
                            print(f"      Variable Short Name: {short_name}")
                            print(f"      Units: {units}")
                            print(f"      Bounding Box: {bbox}")

                            # # Check if coordinates exist
                            # if variable['coordinates']:
                            #     for coord in variable['coordinates']:
                            #         print(f"        Coordinate ID: {coord['coordinate_id']}")
                            #         print(f"        Coordinate Unit: {coord['coordinate_unit']}")
                            #         print(f"        Minimum Value: {coord['minimum_value']}")
                            #         print(f"        Maximum Value: {coord['maximum_value']}")
                            #         print(f"        Step: {coord['step']}")
                            #         print(f"        Chunking Length: {coord['chunking_length']}")

import copernicusmarine

cmsubset = copernicusmarine.subset(
  dataset_id="cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m",
  variables=["uo", "vo"],
  minimum_longitude=-180,
  maximum_longitude=179.9169921875,
  minimum_latitude=-80,
  maximum_latitude=90,
  start_datetime="2025-03-15T00:00:00",
  end_datetime="2025-03-15T00:00:00",
  minimum_depth=0.49402499198913574,
  maximum_depth=0.49402499198913574,
  file_format="zarr"
)
print(cmsubset)
# get dataset