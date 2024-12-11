#!/bin/bash

# Vérification si un fichier de sortie est spécifié
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Erreur : Vous devez spécifier le fichier de sortie et l'AT-URI."
  echo "Usage : $0 <nom_du_fichier> <at-list>"
  exit 1
fi

# Base URL pour l'API
BASE_URL="https://public.api.bsky.app/xrpc/app.bsky.graph.getList"

# Paramètres
AT_URI="$2"
LIMIT=100             # Valeur maximale autorisée
CURSOR=""              # Le curseur initial est vide
OUTPUT_FILE="$1" # Fichier pour stocker les handles

# Initialiser le fichier de sortie
> "$OUTPUT_FILE"

# Boucle pour effectuer les appels API avec pagination
while true; do
  # Construction de l'URL avec les paramètres de requête
  URL="${BASE_URL}?list=${AT_URI}&limit=${LIMIT}"
  if [[ -n "$CURSOR" ]]; then
    URL="${URL}&cursor=${CURSOR}"
  fi

  # Requête API
  RESPONSE=$(curl -s "$URL")

  # Vérifie si l'appel API a échoué
  if [ $? -ne 0 ]; then
    echo "Erreur : Échec de l'appel API."
    break
  fi

  # Vérifie si le champ "items" existe
  ITEMS=$(echo "$RESPONSE" | jq '.items')
  if [[ "$ITEMS" == "null" ]]; then
    echo "Erreur : Champ 'items' introuvable dans la réponse."
    break
  fi

    # Extraire et traiter les handles
  HANDLES=$(echo "$RESPONSE" | jq -r '.items[].subject.handle')
  for HANDLE in $HANDLES; do
    echo "$HANDLE" >> "$OUTPUT_FILE"
  done
  
  # Extraction du curseur suivant
  NEXT_CURSOR=$(echo "$RESPONSE" | jq -r '.cursor // empty')

  # Vérifie s'il n'y a plus de curseur
  if [[ -z "$NEXT_CURSOR" ]]; then
    echo "Plus de résultats. Fin."
    break
  fi

  # Met à jour le curseur pour l'itération suivante
  CURSOR="$NEXT_CURSOR"
done

echo "Extraction terminée. Les handles sont stockés dans '$OUTPUT_FILE'."
