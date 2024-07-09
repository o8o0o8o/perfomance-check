mkdir -p perf

for var in "$@"
do 
  yarn run test:1 $var
  node pickPages $var

  IFS=', ' read -r -a arrayOfUrls <<< `cat perf/pickedWorst`

  for url in "${arrayOfUrls[@]}"
  do
    echo "$url"
    echo $url > perf/currentWebsite
    yarn run test:2 $url && yarn run test:3    
  done
done

yarn run dev