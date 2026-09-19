# Usage: ./push-docker-images.sh 1.0.0
# Set DEPLOY_HOST and REGISTRY before running.
echo "Build: $1"
echo "Starting pushing docker images..."

REGISTRY="${REGISTRY:-registry.example.com/commerce-payments}"
DEPLOY_HOST="${DEPLOY_HOST:-user@your-server}"

echo "cd ~/apps/commerce-payments/"
cd ~/apps/commerce-payments/

echo "docker save -o ./commerce-server.tar $REGISTRY/server:$1"
docker save -o ./commerce-server.tar "$REGISTRY/server:$1"

echo "docker save -o ./commerce-client.tar $REGISTRY/client:$1"
docker save -o ./commerce-client.tar "$REGISTRY/client:$1"

echo "docker save -o ./commerce-admin.tar $REGISTRY/admin:$1"
docker save -o ./commerce-admin.tar "$REGISTRY/admin:$1"

printf "\n\n"

echo "scp commerce-server.tar $DEPLOY_HOST:~/"
scp commerce-server.tar "$DEPLOY_HOST:~/"

echo "scp commerce-client.tar $DEPLOY_HOST:~/"
scp commerce-client.tar "$DEPLOY_HOST:~/"

echo "scp commerce-admin.tar $DEPLOY_HOST:~/"
scp commerce-admin.tar "$DEPLOY_HOST:~/"

rm ./commerce-server.tar
rm ./commerce-client.tar
rm ./commerce-admin.tar
