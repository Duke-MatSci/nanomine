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
    writeError([path_to_write, '/errors.txt'], ''); % ensure that errors.txt exists
    
    
    mkdir(path_to_write);
    
    %
    %% Specify import function according to input option
    switch str2num(input_type)
        case 1
            img = imread([path_to_read,file_name]); % read the incming target and store pixel values
            if length(size(img)) > 2
                imwrite(img(:,:,1:3),[path_to_write,'/','Input1.jpg'])
            elseif length(size(img)) > 1
                imwrite(img,[path_to_write,'/','Input1.jpg'])
            else
                writeError([path_to_write, '/errors.txt'], ['failed to read image file: ', file_name]);
                rc = 97
                exit(rc)
                
            end
        case 2
            img = unzip([path_to_read,file_name],[path_to_write,'/input']);
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
            imwrite(img,[path_to_write,'/','Input1.jpg']);
    end
    
    % run characterization algorithm
    addpath('./descriptor_char'); % add path of directory holding MAIN.m
    er=Descriptor_C2_Binary(path_to_write,str2num(input_type)); %
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

end
end
    function writeError(file, msg)
    f = fopen(file,'a+');
    fprintf(f, '%s\n', msg);
    fclose(f);
    end