mkdir -p perf

for var in "$@"
do 
  yarn run test:1 $var
  node pickPages $var

  IFS=', ' read -r -a arrayOfWorstUrls <<< `cat perf/pickedWorst`

  for url in "${arrayOfWorstUrls[@]}"
  do
    echo "$url"
    echo $url > perf/currentWebsite
    yarn run test:2 $url && yarn run test:3    
  done

    IFS=', ' read -r -a arrayOfBestUrls <<< `cat perf/pickedBest`

  for url in "${arrayOfBestUrls[@]}"
  do
    echo "$url"
    echo $url > perf/currentWebsite
    yarn run test:2 $url && yarn run test:3    
  done
done

yarn run dev