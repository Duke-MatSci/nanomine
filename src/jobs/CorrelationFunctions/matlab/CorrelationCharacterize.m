function CorrelationCharacterize(userId, jobId, jobType, jobSrcDir, jobDir, webBaseUri,input_type,correlation_type,file_name)

%%% Input Types %%
% 1 : Single JPEG Image
% 2 : ZIP file containing JPEG images
% 3 : Image in .mat file
%%
%%% types of correlation function available %%
% 1 : Two Point Autocorrelation
% 2 : Two point Lineal Path Correlation
% 3 : Two point Cluster Correlation
% 4 : Two point Surface-Surface Correlation
%%%

rc=0;
try
  path_to_read = [jobSrcDir,'/'];
  path_to_write = [jobSrcDir,'/output'];
  mkdir(path_to_write);

  %% Specify import function according to input option
  switch str2num(input_type)
      case 1
          img = imread([path_to_file,file_name]); % read the incming target and store pixel values
    if max(img(:)) > 1
      img = round(img/256);
    end
    imwrite(256*img,[path_to_write,'/','Input1.jpg']);
      case 2
          img = unzip([path_to_file,file_name],[path_to_write,'/input']);
      case 3
          load([path_to_file,file_name]);
          img = Input;
    img_viewable = 256 * img;
    imwrite(img_viewable,[path_to_write,'/','Input1.jpg']);
  end

  if str2num(input_type) ~= 2
      if length(size(img)) > 2
         img = img(:,:,1);
      end

      if (max(max(img))) > 1
        Target_img = round(img/256);
      else
        Target_img = img;
      end

      plot_correlation(Target_img,str2num(correlation_type),path_to_write);

  else
     zip_file_processing(path_to_write,str2num(correlation_type));
  end

  %% ZIP files %%
  zip([path_to_write,'/Results.zip'],{'*'},path_to_write);


end
