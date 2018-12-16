# Copies all files listed in the manifest to the target directory.
# Usage: deploy.sh <target_directory>
targetdir=$1
while read line; do
  for file in $line; do
    subdir=`dirname ${file}`
    fulldir="${targetdir}/${subdir}"
    if [ ! -d $fulldir ]; then
      mkdircmd="mkdir -p ${fulldir}"
      echo $mkdircmd
      $mkdircmd
    fi;
    cpcmd="cp ${file} ${fulldir}/`basename ${file}`"
    echo $cpcmd
    $cpcpmd
  done;
done < manifest.txt
