function DescriptorCharacterize(userId, jobId, jobType, jobSrcDir, jobDir, webBaseUri,input_type,file_name)

%%% Input Types %%
% 1 : Single JPEG Image
% 2 : ZIP file containing JPEG images
% 3 : Image in .mat file
%%
   rc=0;
   try
      path_to_read = [jobSrcDir,'/'];
      path_to_write = [jobSrcDir,'/output'];
      mkdir(path_to_write);
  %
      %% Specify import function according to input option
      switch str2num(input_type)
          case 1
              img = imread([path_to_read,file_name]); % read the incming target and store pixel values
              if size(img) > 1
                  imwrite(img(:,:,1),[path_to_write,'/','Input1.jpg'])
              else
                  imwrite(img,[path_to_write,'/','Input1.jpg'])
              end
          case 2
              img = unzip([path_to_read,file_name],[path_to_write,'/input']);
          case 3
              load([path_to_read,file_name]);
              img = Input;
              imwrite(img,[path_to_write,'/','Input1.jpg']);
      end

      % run characterization algorithm
      addpath('./descriptor_char'); % add path of directory holding MAIN.m
      Descriptor_C2_Binary(path_to_write,str2num(input_type)); %

      %% ZIP files %%
      zip([path_to_write,'/Results.zip'],{'*'},path_to_write);

   catch ex
     rc = 99;
     exit(rc);
   end
end

