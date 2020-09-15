function DescriptorCharacterize(userId, jobId, jobType, jobSrcDir, jobDir, webBaseUri,input_type,file_name,phase_cords,conversion_factor)

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
    writeError([path_to_write, '/errors.txt'], ''); % ensure that errors.txt exists

    %
    %% Specify import function according to input option
    %% Specify import function according to input option
   condition=1; % for phase selection
   conversion_factor=str2num(conversion_factor);
    switch str2num(input_type)
        case 1
            img = imread([path_to_read,file_name]); % read the incming target and store pixel values
            if length(size(img)) > 1
                phase_cords = split(phase_cords, '*');
                phase_cords = [str2num(phase_cords{1}) str2num(phase_cords{2})];
                if phase_cords(1)==0 & phase_cords(2) == 0
                    condition=1;
                else
                    [condition]=check_phase(img,phase_cords); % if 0 image needs to be inverted
                end
            else
                writeError([path_to_write, '/errors.txt'], ['failed to read image file: ', file_name]);
                rc = 97
                exit(rc)
            end    
        case 2
            img=unzip([path_to_read,file_name],[path_to_write,'/input']);
        case 3
            path=[path_to_read,file_name];
            k=load(path);
            [no_need,f_name,ext]=fileparts(file_name);
            try
                img = getfield(k,f_name);
            catch ex
                rc = 98;
                msg = getReport(ex);
                writeError([path_to_write, '/errors.txt'], 'The variable name inside the material file shold be the same as the name of the file. Technical details below:');
                
                writeError([path_to_write, '/errors.txt'], msg);
                writeError([path_to_write, '/errors.txt'], sprintf('\n'));
                exit(rc);
            end  
    end

    %%  run characterization algorithm
    addpath('./descriptor_char'); % add path of directory holding MAIN.m
    er=Descriptor_C2_Binary(img,path_to_write,str2num(input_type),condition,conversion_factor); %
    if er==1
        writeError([path_to_write, '/errors.txt'], ['Some of the files in zip folder were not accessible ']);
        rc = 99;
        exit(rc);
    end

    try
        %% ZIP files %%
        zip([path_to_write,'/Results.zip'],{'*'},path_to_write);

    catch ex
        writeError([path_to_write, '/errors.txt'], ['Failed to zip files ']);
        rc = 99;
        exit(rc);
    end
catch
        rc = 99;
        exit(rc);
end
    function writeError(file, msg)
    f = fopen(file,'a+');
    fprintf(f, '%s\n', msg);
    fclose(f);
    end
end